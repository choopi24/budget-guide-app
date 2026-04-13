import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useInvestmentDetailDb, type InvestmentDetail } from '../db/investment-detail';
import { formatDateDisplay } from '../lib/date';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
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

      await addInvestmentUpdate({
        investmentId,
        effectiveDate: effectiveDate.toISOString(),
        valueCents: finalValueCents,
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

      <View style={styles.card}>
        <Text style={styles.eyebrow}>Investment update</Text>
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
          <View style={styles.field}>
            <Text style={styles.label}>
              {cryptoMode === 'buy'
                ? `How much more ${detail?.asset_symbol || 'coin'} did you buy?`
                : `How much ${detail?.asset_symbol || 'coin'} did you sell?`}
            </Text>
            <TextInput
              value={quantityDelta}
              onChangeText={setQuantityDelta}
              placeholder="0.1"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>
            When did this happen?
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.inputButton}
          >
            <Text style={styles.inputButtonText}>
              {formatDateDisplay(effectiveDate.toISOString())}
            </Text>
          </Pressable>

          {showDatePicker && (
            <View style={Platform.OS === 'ios' ? styles.pickerContainer : undefined}>
              <DateTimePicker
                value={effectiveDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={colors.text}
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (selectedDate) setEffectiveDate(selectedDate);
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.inlinePickerFooter}>
                  <Pressable onPress={() => setShowDatePicker(false)} style={styles.smallButton}>
                    <Text style={styles.smallButtonText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {isCrypto && cryptoMode === 'buy'
              ? 'How much did you purchase?'
              : isCrypto && cryptoMode === 'sell'
              ? 'How much did you sell?'
              : isCrypto
              ? 'New total value'
              : 'How much did you add?'}
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="12500"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

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

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.button,
            (!canSave || pressed) && styles.buttonPressed,
            !canSave && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Confirm Entry'}
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
    padding: 20,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.keep,
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
    marginTop: 16,
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
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  inputButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlinePickerFooter: {
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  smallButton: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: '600',
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
  button: {
    marginTop: 20,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});