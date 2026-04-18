import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useInvestmentDetailDb, type InvestmentDetail, type InvestmentUpdateType } from '../db/investment-detail';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

type CryptoUpdateMode = 'buy' | 'sell' | 'value';

export default function InvestmentUpdateNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const investmentId = Number(params.id);

  const { addInvestmentUpdate, getInvestmentDetail } = useInvestmentDetailDb();

  const [detail, setDetail] = useState<InvestmentDetail | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('');
  const [cryptoMode, setCryptoMode] = useState<CryptoUpdateMode>('buy');

  const [effectiveDate, setEffectiveDate] = useState(new Date());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const item = await getInvestmentDetail(investmentId);
      if (mounted) {
        setDetail(item);
      }
    }

    if (investmentId) {
      load();
    }

    return () => {
      mounted = false;
    };
  }, [investmentId, getInvestmentDetail]);

  const quantityNumber = useMemo(() => Number(quantityDelta || 0), [quantityDelta]);

  const isCrypto = detail?.category === 'Crypto';
  const needsQuantity = isCrypto && cryptoMode !== 'value';

  const inputCents = parseMoneyToCents(value);

  const canSave =
    inputCents > 0 &&
    investmentId > 0 &&
    (!needsQuantity || quantityNumber > 0) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setError('');

    try {
      let computedDelta: number | null = null;

      if (needsQuantity) {
        computedDelta = cryptoMode === 'sell' ? -quantityNumber : quantityNumber;
      }

      let finalValueCents: number;
      if (isCrypto && cryptoMode === 'buy') {
        finalValueCents = (detail?.current_value_cents ?? 0) + inputCents;
      } else if (isCrypto && cryptoMode === 'sell') {
        finalValueCents = Math.max(0, (detail?.current_value_cents ?? 0) - inputCents);
      } else if (isCrypto) {
        // Value-only crypto mode: set the new total directly
        finalValueCents = inputCents;
      } else {
        // Non-crypto: add the amount to the current total
        finalValueCents = (detail?.current_value_cents ?? 0) + inputCents;
      }

      const updateType: InvestmentUpdateType =
        isCrypto && cryptoMode === 'sell' ? 'sell'
        : isCrypto && cryptoMode === 'value' ? 'value_update'
        : 'buy';

      await addInvestmentUpdate({
        investmentId,
        effectiveDate: effectiveDate.toISOString(),
        valueCents: finalValueCents,
        type: updateType,
        amountCents: updateType !== 'value_update' ? inputCents : null,
        note,
        quantityDelta: computedDelta,
      });

      router.replace(`/investment/${investmentId}` as any);
    } catch (err: any) {
      setError(err?.message || 'Could not save update.');
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

      <Card variant="outlined">
        <SectionLabel style={styles.eyebrow}>Investment update</SectionLabel>
        <Text style={styles.title}>Add an update</Text>
        <Text style={styles.body}>
          {isCrypto
            ? 'For crypto, you can record buying more, selling some, or just updating the value.'
            : 'Record a new value and the date it became relevant.'}
        </Text>

        {isCrypto && (
          <View style={styles.field}>
            <Text style={styles.label}>What changed?</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setCryptoMode('buy')}
                style={[
                  styles.segmentButton,
                  cryptoMode === 'buy' && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    cryptoMode === 'buy' && styles.segmentTextActive,
                  ]}
                >
                  Bought more
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCryptoMode('sell')}
                style={[
                  styles.segmentButton,
                  cryptoMode === 'sell' && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    cryptoMode === 'sell' && styles.segmentTextActive,
                  ]}
                >
                  Sold some
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCryptoMode('value')}
                style={[
                  styles.segmentButton,
                  cryptoMode === 'value' && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    cryptoMode === 'value' && styles.segmentTextActive,
                  ]}
                >
                  Value only
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {needsQuantity && (
          <Input
            label={
              cryptoMode === 'buy'
                ? `How much more ${detail?.asset_symbol || 'coin'} did you buy?`
                : `How much ${detail?.asset_symbol || 'coin'} did you sell?`
            }
            value={quantityDelta}
            onChangeText={setQuantityDelta}
            placeholder="0.1"
            keyboardType="decimal-pad"
            containerStyle={styles.field}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>When did this happen?</Text>
          <DatePickerField value={effectiveDate} onChange={setEffectiveDate} />
        </View>

        <Input
          label={
            isCrypto && cryptoMode === 'buy'
              ? 'How much did you purchase?'
              : isCrypto && cryptoMode === 'sell'
              ? 'How much did you sell?'
              : isCrypto
              ? 'New total value'
              : 'How much did you add?'
          }
          value={value}
          onChangeText={setValue}
          placeholder="12500"
          keyboardType="decimal-pad"
          containerStyle={styles.field}
        />

        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          style={styles.noteInput}
          containerStyle={styles.field}
          multiline
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label={saving ? 'Saving…' : 'Confirm Entry'}
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
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  eyebrow: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  field: {
    marginTop: spacing[4],
  },
  noteInput: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
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
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.text,
  },
  errorText: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});