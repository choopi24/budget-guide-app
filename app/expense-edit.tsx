import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { BackButton } from '../components/ui/BackButton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DeleteButton } from '../components/ui/DeleteButton';
import { Input } from '../components/ui/Input';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SectionLabel } from '../components/ui/SectionLabel';
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
        <BackButton onPress={() => router.back()} />
        <DeleteButton onPress={handleDelete} accessibilityLabel="Delete expense" />
      </View>

      <Card variant="outlined">
        <SectionLabel style={styles.eyebrow}>Edit expense</SectionLabel>
        <Text style={styles.title}>{loading ? '…' : title}</Text>

        {/* ── Amount — primary focus ── */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <TextInput
            ref={amountRef}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="done"
            placeholder="0"
            placeholderTextColor={colors.border}
            style={styles.amountInput}
            autoFocus
            accessibilityLabel="Amount"
          />
        </View>

        {/* ── Description ── */}
        <Input
          label="What was it for?"
          value={title}
          onChangeText={setTitle}
          placeholder="Groceries, taxi, dinner…"
          returnKeyType="done"
          accessibilityLabel="Expense description"
          containerStyle={styles.field}
        />

        {/* ── Metadata group: Date + Category ── */}
        <View style={styles.metaSection}>
          <View style={styles.metaField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <DatePickerField value={spentOn} onChange={setSpentOn} />
          </View>

          {!isInvestment && (
            <View style={styles.metaField}>
              <Text style={styles.fieldLabel}>Category</Text>
              <SegmentedControl
                value={bucket}
                onChange={(v) => setBucket(v as 'must' | 'want')}
                options={[
                  { value: 'must', label: 'Must', activeColor: colors.must, activeBgColor: colors.mustSoft },
                  { value: 'want', label: 'Want', activeColor: colors.want, activeBgColor: colors.wantSoft },
                ]}
              />
            </View>
          )}
        </View>

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
    marginBottom: spacing[3],
  },
  eyebrow: {
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },

  // ── Amount — primary ──────────────────────────────────────────────────────
  amountSection: {
    marginTop: spacing[4],
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[2],
  },
  amountInput: {
    minHeight: 68,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text,
  },

  // ── Secondary fields ──────────────────────────────────────────────────────
  field: {
    marginTop: spacing[5],
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing[2],
  },
  metaSection: {
    marginTop: spacing[6],
    gap: spacing[5],
  },
  metaField: {},
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[3] + 2,
    textAlignVertical: 'top',
  },
});
