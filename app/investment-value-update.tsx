import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { useInvestmentDetailDb, type InvestmentDetail } from '../db/investment-detail';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

export default function InvestmentValueUpdateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const investmentId = Number(id);

  const { getInvestmentDetail, addInvestmentUpdate } = useInvestmentDetailDb();
  const { getCurrency } = useSettingsDb();

  const [detail, setDetail]     = useState<InvestmentDetail | null>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [newValue, setNewValue] = useState('');
  const [note, setNote]         = useState('');
  const [date, setDate]         = useState(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const noteRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!investmentId) return;
    Promise.all([getInvestmentDetail(investmentId), getCurrency()]).then(
      ([d, cur]) => {
        setDetail(d ?? null);
        setCurrency(cur);
      }
    );
  }, [investmentId, getInvestmentDetail, getCurrency]);

  const newValueCents = useMemo(() => parseMoneyToCents(newValue), [newValue]);
  const canSave = newValueCents > 0 && !saving;

  async function handleSave() {
    if (!canSave || !detail) return;
    setSaving(true);
    setError('');
    try {
      await addInvestmentUpdate({
        investmentId,
        effectiveDate: date.toISOString(),
        valueCents: newValueCents,
        type: 'value_update',
        amountCents: null,
        note,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Could not save update.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>Update value</Text>
        <Text style={styles.title}>{detail?.name ?? '...'}</Text>

        {/* Current value context */}
        {detail && (
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>Current recorded value</Text>
            <Text style={styles.contextValue}>
              {formatCentsToMoney(detail.current_value_cents, currency)}
            </Text>
          </View>
        )}

        {/* New value input */}
        <View style={styles.field}>
          <Text style={styles.label}>New total value</Text>
          <TextInput
            value={newValue}
            onChangeText={setNewValue}
            placeholder="5200"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => noteRef.current?.focus()}
            blurOnSubmit={false}
            autoFocus
            style={styles.input}
            accessibilityLabel="New total value"
          />
        </View>

        {/* Date — hidden by default */}
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

        {/* Note */}
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
          accessibilityLabel="Save value update"
          accessibilityState={{ disabled: !canSave }}
          style={({ pressed }) => [
            styles.button,
            (!canSave || pressed) && styles.buttonPressed,
            !canSave && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Save update'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
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
    marginBottom: 16,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  contextLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  contextValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
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
  button: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { backgroundColor: colors.buttonDisabled },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
