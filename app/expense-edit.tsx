import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { useExpenseHistoryDb } from '../db/expense-history';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

export default function ExpenseEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const expenseId = Number(id);

  const { getExpenseById, updateExpense, deleteExpense } = useExpenseHistoryDb();

  const [title, setTitle]     = useState('');
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');
  const [bucket, setBucket]   = useState<'must' | 'want'>('want');
  const [spentOn, setSpentOn] = useState(new Date());
  const [isInvestment, setIsInvestment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!expenseId) return;
    getExpenseById(expenseId).then((exp) => {
      if (!exp) return;
      setTitle(exp.title);
      setAmount(String(exp.amount_cents / 100));
      setNote(exp.note ?? '');
      setBucket(exp.final_bucket);
      setSpentOn(new Date(exp.spent_on));
      setIsInvestment(exp.is_investment === 1);
      setLoading(false);
    });
  }, [expenseId, getExpenseById]);

  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);
  const canSave = !loading && title.trim().length > 0 && amountCents > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateExpense({
        id: expenseId,
        title,
        amountCents,
        spentOn: spentOn.toISOString(),
        note,
        finalBucket: bucket,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete expense',
      'This will remove the expense and update that month\'s totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(expenseId);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={16} color={colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <Pressable onPress={handleDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>Edit expense</Text>
        <Text style={styles.title}>{loading ? '…' : title}</Text>

        {/* ── Title ── */}
        <View style={styles.field}>
          <Text style={styles.label}>What was it for?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Groceries, taxi, dinner..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        {/* ── Amount ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="120"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        {/* ── Date ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <DatePickerField value={spentOn} onChange={setSpentOn} />
        </View>

        {/* ── Category — hidden for investment expenses ── */}
        {!isInvestment && (
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setBucket('must')}
                style={[styles.segmentButton, bucket === 'must' && styles.segmentButtonActive]}
              >
                <Text style={[styles.segmentText, bucket === 'must' && styles.segmentTextActive]}>
                  Must
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBucket('want')}
                style={[styles.segmentButton, bucket === 'want' && styles.segmentButtonActive]}
              >
                <Text style={[styles.segmentText, bucket === 'want' && styles.segmentTextActive]}>
                  Want
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Note ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.noteInput]}
            multiline
          />
        </View>

        {/* ── Save ── */}
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            (!canSave || pressed) && styles.saveButtonPressed,
            !canSave && styles.saveButtonDisabled,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving…' : 'Save changes'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  field: {
    marginTop: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  noteInput: {
    minHeight: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  saveButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: { opacity: 0.9 },
  saveButtonDisabled: { backgroundColor: colors.buttonDisabled },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
