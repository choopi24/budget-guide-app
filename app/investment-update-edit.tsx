import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  useInvestmentDetailDb,
  type InvestmentUpdateRow,
  type InvestmentUpdateType,
} from '../db/investment-detail';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

// ─── Label helpers ────────────────────────────────────────────────────────────

const EYEBROW: Record<InvestmentUpdateType, string> = {
  initial:      'Opening entry',
  value_update: 'Value update',
  buy:          'Purchase',
  sell:         'Sale',
};

const VALUE_LABEL: Record<InvestmentUpdateType, string> = {
  initial:      'Opening value',
  value_update: 'Total value',
  buy:          'Resulting total',
  sell:         'Resulting total',
};

const AMOUNT_LABEL: Record<InvestmentUpdateType, string> = {
  initial:      '',
  value_update: '',
  buy:          'Amount purchased',
  sell:         'Amount sold',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InvestmentUpdateEditScreen() {
  const router = useRouter();
  const { updateId, investmentId } = useLocalSearchParams<{
    updateId: string;
    investmentId: string;
  }>();

  const updateIdNum     = Number(updateId);
  const investmentIdNum = Number(investmentId);

  const { getInvestmentUpdate, editInvestmentUpdate, deleteInvestmentUpdate } =
    useInvestmentDetailDb();
  const { getCurrency } = useSettingsDb();

  const [row, setRow]           = useState<InvestmentUpdateRow | null>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  // Controlled field values — populated once the row loads.
  const [value, setValue]   = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [date, setDate]     = useState(new Date());
  const [dateOpen, setDateOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const amountRef = useRef<TextInput>(null);
  const noteRef   = useRef<TextInput>(null);

  useEffect(() => {
    if (!updateIdNum) return;
    Promise.all([getInvestmentUpdate(updateIdNum), getCurrency()]).then(
      ([r, cur]) => {
        if (!r) return;
        setRow(r);
        setValue(String(r.value_cents / 100));
        setAmount(r.amount_cents != null ? String(r.amount_cents / 100) : '');
        setNote(r.note ?? '');
        // Parse the stored ISO/date string as local midnight to avoid UTC shift.
        const raw = r.effective_date;
        const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        setDate(
          dateMatch
            ? new Date(
                Number(dateMatch[1]),
                Number(dateMatch[2]) - 1,
                Number(dateMatch[3])
              )
            : new Date(raw)
        );
        setCurrency(cur);
      }
    );
  }, [updateIdNum, getInvestmentUpdate, getCurrency]);

  const valueCents  = useMemo(() => parseMoneyToCents(value), [value]);
  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);

  const showAmountField = row?.type === 'buy' || row?.type === 'sell';
  const isInitial       = row?.type === 'initial';

  const canSave =
    !!row &&
    valueCents > 0 &&
    (!showAmountField || amountCents > 0) &&
    !saving;

  async function handleSave() {
    if (!canSave || !row) return;
    setSaving(true);
    setError('');
    try {
      await editInvestmentUpdate({
        updateId: updateIdNum,
        investmentId: investmentIdNum,
        type: row.type,
        effectiveDate: date.toISOString(),
        valueCents,
        amountCents: showAmountField ? amountCents : null,
        note,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (isInitial) {
      Alert.alert(
        'Cannot delete opening entry',
        'The opening entry is the foundation of this investment\'s history. Edit it instead.'
      );
      return;
    }

    Alert.alert(
      'Delete this entry?',
      'This will remove the record and recalculate the investment\'s current value.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteInvestmentUpdate({
              updateId: updateIdNum,
              investmentId: investmentIdNum,
            });
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

        {!isInitial && (
          <Pressable
            onPress={handleDelete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Delete this entry"
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          {row ? EYEBROW[row.type] : '…'}
        </Text>
        <Text style={styles.title}>Edit entry</Text>

        {/* ── Amount field (buy / sell only) ── */}
        {showAmountField && (
          <View style={styles.field}>
            <Text style={styles.label}>
              {row ? AMOUNT_LABEL[row.type] : ''}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="1000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              blurOnSubmit={false}
              autoFocus={showAmountField}
              style={styles.input}
              accessibilityLabel={row ? AMOUNT_LABEL[row.type] : 'Amount'}
            />
          </View>
        )}

        {/* ── Total / value field ── */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {row ? VALUE_LABEL[row.type] : 'Value'}
          </Text>
          <TextInput
            ref={showAmountField ? amountRef : undefined}
            value={value}
            onChangeText={setValue}
            placeholder="5200"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => noteRef.current?.focus()}
            blurOnSubmit={false}
            autoFocus={!showAmountField}
            style={styles.input}
            accessibilityLabel={row ? VALUE_LABEL[row.type] : 'Value'}
          />
          {showAmountField && (
            <Text style={styles.fieldHint}>
              The total investment value after this {row?.type === 'sell' ? 'sale' : 'purchase'}.
            </Text>
          )}
        </View>

        {/* ── Date (collapsible) ── */}
        <Pressable
          onPress={() => setDateOpen((v) => !v)}
          style={styles.changeDateRow}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={dateOpen ? 'Hide date picker' : 'Change date'}
        >
          <Text style={styles.changeDateText}>
            {dateOpen ? 'Hide date' : 'Change date'}
          </Text>
          <Ionicons
            name={dateOpen ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={colors.textMuted}
          />
        </Pressable>

        {dateOpen && (
          <View style={styles.datePickerWrap}>
            <DatePickerField value={date} onChange={setDate} />
          </View>
        )}

        {/* ── Note ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            ref={noteRef}
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.noteInput]}
            multiline
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
          accessibilityState={{ disabled: !canSave }}
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
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.keep,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
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
  fieldHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  changeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  changeDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  datePickerWrap: {
    marginTop: 10,
  },
  errorText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
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
