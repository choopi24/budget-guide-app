import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useExpenseHistoryDb } from '../db/expense-history';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

export default function ExpenseEditScreen() {
  const router     = useRouter();
  const { id }     = useLocalSearchParams<{ id: string }>();
  const expenseId  = Number(id);

  const { getExpenseById, updateExpense, deleteExpense } = useExpenseHistoryDb();

  const [title, setTitle]       = useState('');
  const [amount, setAmount]     = useState('');
  const [note, setNote]         = useState('');
  const [bucket, setBucket]     = useState<'must' | 'want'>('want');
  const [spentOn, setSpentOn]   = useState(new Date());
  const [isInvestment, setIsInvestment] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const amountRef = useRef<TextInput>(null);

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
  const canSave     = !loading && title.trim().length > 0 && amountCents > 0 && !saving;

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
      "This will remove the expense and update that month's totals.",
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
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={16} color={colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Delete expense"
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
      </View>

      <Card variant="outlined">
        <Text style={styles.eyebrow}>Edit expense</Text>
        <Text style={styles.title}>{loading ? '…' : title}</Text>

        {/* ── Description ── */}
        <Input
          label="What was it for?"
          value={title}
          onChangeText={setTitle}
          placeholder="Groceries, taxi, dinner…"
          returnKeyType="next"
          onSubmitEditing={() => amountRef.current?.focus()}
          blurOnSubmit={false}
          accessibilityLabel="Expense description"
          containerStyle={styles.field}
        />

        {/* ── Amount ── */}
        <Input
          ref={amountRef}
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder="120"
          accessibilityLabel="Amount"
          containerStyle={styles.field}
        />

        {/* ── Date ── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date</Text>
          <DatePickerField value={spentOn} onChange={setSpentOn} />
        </View>

        {/* ── Category — hidden for investment expenses ── */}
        {!isInvestment && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setBucket('must')}
                accessibilityRole="button"
                accessibilityLabel="Must — essential spending"
                accessibilityState={{ selected: bucket === 'must' }}
                style={[styles.segmentBtn, bucket === 'must' && styles.segmentMustActive]}
              >
                <Text style={[styles.segmentText, bucket === 'must' && styles.segmentMustText]}>
                  Must
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBucket('want')}
                accessibilityRole="button"
                accessibilityLabel="Want — discretionary spending"
                accessibilityState={{ selected: bucket === 'want' }}
                style={[styles.segmentBtn, bucket === 'want' && styles.segmentWantActive]}
              >
                <Text style={[styles.segmentText, bucket === 'want' && styles.segmentWantText]}>
                  Want
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Note ── */}
        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
          style={styles.noteInput}
          containerStyle={styles.field}
        />

        <Button
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],   // 12
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingLeft: spacing[2] + 2,
    paddingRight: spacing[3] + 2,
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
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  field: {
    marginTop: spacing[5],  // 20
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing[2],
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing[2] + 2,    // 10
  },
  segmentBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentMustActive: {
    backgroundColor: colors.mustSoft,
    borderColor: colors.must,
  },
  segmentWantActive: {
    backgroundColor: colors.wantSoft,
    borderColor: colors.want,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentMustText: { color: colors.must },
  segmentWantText: { color: colors.want },
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[3] + 2,  // 14
    textAlignVertical: 'top',
  },
});
