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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Input } from '../components/ui/Input';
import { useInvestmentDetailDb, type InvestmentDetail } from '../db/investment-detail';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { hapticSuccess } from '../lib/haptics';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

export default function InvestmentPurchaseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const investmentId = Number(id);

  const { getInvestmentDetail, addInvestmentUpdate } = useInvestmentDetailDb();
  const { getCurrency } = useSettingsDb();

  const [detail, setDetail]     = useState<InvestmentDetail | null>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [amount, setAmount]     = useState('');
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

  const purchaseCents = useMemo(() => parseMoneyToCents(amount), [amount]);
  const newTotalCents = (detail?.current_value_cents ?? 0) + purchaseCents;
  const canSave = purchaseCents > 0 && !saving;

  async function handleSave() {
    if (!canSave || !detail) return;
    setSaving(true);
    setError('');
    try {
      await addInvestmentUpdate({
        investmentId,
        effectiveDate: date.toISOString(),
        valueCents: newTotalCents,
        type: 'buy',
        amountCents: purchaseCents,
        note,
      });
      hapticSuccess();
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Could not save purchase.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => pressed && styles.cancelPressed}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <Card variant="outlined">
        <SectionLabel style={styles.eyebrow}>Add purchase</SectionLabel>
        <Text style={styles.title}>{detail?.name ?? '...'}</Text>

        {/* Current holding context */}
        {detail && (
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>Current holding</Text>
            <Text style={styles.contextValue}>
              {formatCentsToMoney(detail.current_value_cents, currency)}
            </Text>
          </View>
        )}

        {/* Purchase amount */}
        <Input
          label="Additional amount purchased"
          value={amount}
          onChangeText={setAmount}
          placeholder="1000"
          keyboardType="decimal-pad"
          returnKeyType="next"
          onSubmitEditing={() => noteRef.current?.focus()}
          blurOnSubmit={false}
          autoFocus
          containerStyle={styles.field}
          accessibilityLabel="Additional amount purchased"
        />

        {/* New total preview */}
        {purchaseCents > 0 && detail && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>New total</Text>
            <Text style={styles.previewValue}>
              {formatCentsToMoney(newTotalCents, currency)}
            </Text>
          </View>
        )}

        {/* Date — hidden by default */}
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

        {/* Note */}
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
          label={saving ? 'Saving…' : 'Save purchase'}
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
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  cancelPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },
  eyebrow: {
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[4],
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
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
    marginTop: spacing[5],
  },
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
