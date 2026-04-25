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
import { BackButton } from '../components/ui/BackButton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DeleteButton } from '../components/ui/DeleteButton';
import { Input } from '../components/ui/Input';
import { SectionLabel } from '../components/ui/SectionLabel';
import {
  useInvestmentDetailDb,
  type InvestmentUpdateRow,
  type InvestmentUpdateType,
} from '../db/investment-detail';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

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
        <BackButton onPress={() => router.back()} />
        {!isInitial && (
          <DeleteButton onPress={handleDelete} accessibilityLabel="Delete this entry" />
        )}
      </View>

      <Card variant="outlined">
        <SectionLabel style={styles.eyebrow}>
          {row ? EYEBROW[row.type] : '…'}
        </SectionLabel>
        <Text style={styles.title}>Edit entry</Text>

        {/* ── Amount field (buy / sell only) ── */}
        {showAmountField && (
          <Input
            label={row ? AMOUNT_LABEL[row.type] : ''}
            value={amount}
            onChangeText={setAmount}
            placeholder="1000"
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => amountRef.current?.focus()}
            blurOnSubmit={false}
            autoFocus={showAmountField}
            containerStyle={styles.field}
            accessibilityLabel={row ? AMOUNT_LABEL[row.type] : 'Amount'}
          />
        )}

        {/* ── Total / value field ── */}
        <Input
          ref={showAmountField ? amountRef : undefined}
          label={row ? VALUE_LABEL[row.type] : 'Value'}
          value={value}
          onChangeText={setValue}
          placeholder="5200"
          keyboardType="decimal-pad"
          returnKeyType="next"
          onSubmitEditing={() => noteRef.current?.focus()}
          blurOnSubmit={false}
          autoFocus={!showAmountField}
          hint={showAmountField ? `The total investment value after this ${row?.type === 'sell' ? 'sale' : 'purchase'}.` : undefined}
          containerStyle={styles.field}
          accessibilityLabel={row ? VALUE_LABEL[row.type] : 'Value'}
        />

        {/* ── Date (collapsible) ── */}
        <Pressable
          onPress={() => setDateOpen((v) => !v)}
          style={({ pressed }) => [styles.changeDateRow, pressed && styles.changeDateRowPressed]}
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
        <Input
          ref={noteRef}
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
          style={styles.noteInput}
          containerStyle={styles.field}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

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
    marginBottom: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[1],
  },
  field: {
    marginTop: spacing[5],
  },
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },
  changeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[4],
    alignSelf: 'flex-start',
  },
  changeDateText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  changeDateRowPressed: {
    opacity: 0.55,
  },
  datePickerWrap: {
    marginTop: spacing[3],
  },
  errorText: {
    marginTop: spacing[4],
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
});
