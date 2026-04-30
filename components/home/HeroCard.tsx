import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui/Card';
import { Eyebrow, HeroNumber } from '../ui/Typography';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { spacing } from '../../theme/tokens';

type Props = {
  currencySymbol: string;
  heroAmountText: string;
  isOverBudget: boolean;
  daysLeft: number;
  pctUsed: number;
  paceLabel: string;
};

export function HeroCard({ currencySymbol, heroAmountText, isOverBudget, daysLeft, pctUsed, paceLabel }: Props) {
  return (
    <Card variant="hero" style={styles.heroCard}>
      <View style={styles.heroEyebrowRow}>
        <Eyebrow color={colors.textTertiary}>LEFT TO SPEND</Eyebrow>
        <Eyebrow color={colors.textTertiary}>{daysLeft} DAYS LEFT</Eyebrow>
      </View>
      <View style={styles.heroAmountRow}>
        <Text style={styles.heroCurrencySymbol}>{currencySymbol}</Text>
        <HeroNumber color={isOverBudget ? colors.danger : colors.surface}>{heroAmountText}</HeroNumber>
      </View>
      <Text style={styles.heroPaceStrip}>{pctUsed}% USED · {paceLabel}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginTop: spacing[5],
    marginBottom: spacing[6],
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  heroCurrencySymbol: {
    fontSize: 18,
    color: colors.textTertiary,
    marginTop: spacing[1],
    marginRight: 2,
  },
  heroPaceStrip: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
});
