import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type SupportedCurrency } from '../../db/settings';
import { type ExpenseBucket } from '../../lib/expenseClassifier';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';

type Props = {
  canSave: boolean;
  saving: boolean;
  amountCents: number;
  currency: SupportedCurrency;
  bucket: ExpenseBucket;
  onSave: () => void;
  paddingBottom: number;
};

export function ExpenseSaveCta({
  canSave,
  saving,
  amountCents,
  currency,
  bucket,
  onSave,
  paddingBottom,
}: Props) {
  const bucketColor = bucket === 'must' ? colors.must : colors.want;
  const ctaBg       = canSave ? bucketColor        : colors.buttonDisabled;
  const ctaColor    = canSave ? colors.background  : colors.textMuted;

  const label = saving
    ? 'Saving…'
    : amountCents > 0
      ? `Save · ${formatCentsToMoney(amountCents, currency)} to ${bucket === 'must' ? 'Must' : 'Want'}`
      : `Save to ${bucket === 'must' ? 'Must' : 'Want'}`;

  return (
    <View style={[styles.ctaWrapper, { paddingBottom: Math.max(paddingBottom, 16) }]}>
      <Pressable
        onPress={onSave}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.ctaButton,
          { backgroundColor: ctaBg },
          pressed && canSave && styles.ctaPressed,
        ]}
      >
        <Text style={[styles.ctaLabel, { color: ctaColor }]}>{label}</Text>
        {!saving && canSave && (
          <Text style={[styles.ctaArrow, { color: ctaColor }]}>→</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 999,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ctaArrow: {
    fontSize: 17,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
