import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui/Card';
import { Eyebrow, Headline } from '../ui/Typography';
import { type RowItem } from '../../hooks/useHomeData';
import { type SupportedCurrency } from '../../db/settings';
import { getMonthLabelFromKey } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';

type Props = {
  rows: RowItem[];
  paceRatio: number;
  currency: SupportedCurrency;
  monthKey: string;
};

export function BudgetMetersCard({ rows, paceRatio, currency, monthKey }: Props) {
  return (
    <Card padding={spacing[5]} style={styles.metersCard}>
      <View style={styles.metersTitleRow}>
        <Eyebrow color={colors.textTertiary}>THIS MONTH</Eyebrow>
        <Eyebrow color={colors.textTertiary}>{getMonthLabelFromKey(monthKey)}</Eyebrow>
      </View>
      {rows.map((row, index) => {
        const fillPct    = row.planned > 0 ? Math.min(row.used / row.planned, 1) : 0;
        const ratio      = row.planned > 0 ? row.used / row.planned : 0;
        const overBudget = row.used > row.planned && row.planned > 0;
        const fillColor  = overBudget ? colors.danger : row.color;
        const rowPaceLabel =
          ratio > paceRatio + 0.05 ? 'OVER'
          : ratio < paceRatio - 0.05 ? 'AHEAD'
          : 'ON PACE';
        return (
          <View key={row.label}>
            {index > 0 && <View style={styles.meterSep} />}
            <View style={styles.meterRow}>
              <View style={styles.meterLeft}>
                <Headline>{row.label}</Headline>
                <Text style={styles.meterMono} numberOfLines={1}>
                  {formatCentsToMoney(row.used, currency)}/{formatCentsToMoney(row.planned, currency)} · {rowPaceLabel}
                </Text>
              </View>
              <View style={styles.meterRight}>
                <View style={styles.meterTrackWrap}>
                  {paceRatio > 0.02 && paceRatio < 0.98 && (
                    <View style={[styles.meterTick, { left: `${paceRatio * 100}%` as any }]} />
                  )}
                  <View style={[styles.meterTrack, { backgroundColor: row.softColor }]}>
                    <View style={[styles.meterFill, { width: `${fillPct * 100}%` as any, backgroundColor: fillColor }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  metersCard: {
    marginBottom: spacing[6],
  },
  metersTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  meterSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[4],
  },
  meterLeft: {
    flex: 1,
  },
  meterMono: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textTertiary,
    marginTop: 3,
  },
  meterRight: {
    width: 96,
  },
  meterTrackWrap: {
    paddingTop: 6,
  },
  meterTick: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
    transform: [{ translateX: -2 }],
  },
  meterTrack: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  meterFill: {
    height: 4,
    borderRadius: radius.full,
  },
});
