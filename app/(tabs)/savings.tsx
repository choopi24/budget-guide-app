import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { InvestmentLineChart } from '../../components/InvestmentLineChart';
import { Card } from '../../components/ui/Card';
import { FabButton } from '../../components/ui/FabButton';
import { Eyebrow, Headline, HeroNumber } from '../../components/ui/Typography';
import { useInvestmentsDb } from '../../db/investments';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { formatDateDisplay } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type InvestmentItem = {
  id: number;
  name: string;
  category: string;
  opening_amount_cents: number;
  current_value_cents: number;
  total_cost_basis_cents: number;
  opening_date: string;
  note: string | null;
};

type TimelineRow = { effective_date: string; portfolio_value_cents: number };
type ChartRange = '1M' | '3M' | 'YTD' | 'All';

const RANGES: ChartRange[] = ['1M', '3M', 'YTD', 'All'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterTimeline(data: TimelineRow[], range: ChartRange): TimelineRow[] {
  if (range === 'All' || data.length === 0) return data;
  const now = new Date();
  let cutoff: Date;
  if (range === '1M')      cutoff = new Date(now.getFullYear(), now.getMonth() - 1,  now.getDate());
  else if (range === '3M') cutoff = new Date(now.getFullYear(), now.getMonth() - 3,  now.getDate());
  else                     cutoff = new Date(now.getFullYear(), 0, 1); // YTD
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter(row => row.effective_date >= cutoffStr);
}

function shortLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function SavingsScreen() {
  const router = useRouter();
  const { getInvestmentsList, getPortfolioTimeline } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();

  const [items,     setItems]     = useState<InvestmentItem[]>([]);
  const [timeline,  setTimeline]  = useState<TimelineRow[]>([]);
  const [currency,  setCurrency]  = useState<SupportedCurrency>('ILS');
  const [loadError, setLoadError] = useState(false);
  const [range,     setRange]     = useState<ChartRange>('All');

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const [result, tl, savedCurrency] = await Promise.all([
        getInvestmentsList(),
        getPortfolioTimeline(),
        getCurrency(),
      ]);
      setItems(result as InvestmentItem[]);
      setTimeline(tl);
      setCurrency(savedCurrency);
    } catch {
      setLoadError(true);
    }
  }, [getInvestmentsList, getPortfolioTimeline, getCurrency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalCurrent   = items.reduce((s, i) => s + i.current_value_cents,    0);
  const totalCostBasis = items.reduce((s, i) => s + i.total_cost_basis_cents,  0);
  const totalGain      = totalCurrent - totalCostBasis;
  const isPositive     = totalGain >= 0;

  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';
  const heroAmountText = Math.floor(totalCurrent / 100).toLocaleString('en-US');
  const deltaPct       = totalCostBasis > 0
    ? (Math.abs(totalGain) / totalCostBasis * 100).toFixed(1)
    : '0.0';
  const arrow     = isPositive ? '▲' : '▼';
  const deltaColor = isPositive ? colors.primary : colors.danger;

  // ── Chart data ────────────────────────────────────────────────────────────

  // All-time sparkline for hero card header (uses full timeline, no range filter)
  const sparkPoints = useMemo(
    () => timeline.map(row => ({ value: row.portfolio_value_cents / 100 })),
    [timeline]
  );

  // Range-filtered points for the full trend chart
  const rangedTimeline = useMemo(() => filterTimeline(timeline, range), [timeline, range]);
  const trendPoints    = useMemo(
    () => rangedTimeline.map(row => ({
      value: row.portfolio_value_cents / 100,
      label: shortLabel(row.effective_date),
    })),
    [rangedTimeline]
  );

  const hasEnoughData     = timeline.length >= 2;
  const hasRangedData     = trendPoints.length >= 2;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <AppScreen scroll>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topEyebrow}>Portfolio</Text>
            <Text style={styles.topTitle}>Invest</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* Hero: portfolio value */}
        <Card variant="hero" style={styles.heroCard}>
          <Eyebrow color={colors.textTertiary}>PORTFOLIO VALUE</Eyebrow>

          <View style={styles.heroAmountRow}>
            <Text style={styles.heroCurrencySymbol}>{currencySymbol}</Text>
            <HeroNumber color={colors.surface}>{heroAmountText}</HeroNumber>
          </View>

          <Text style={styles.heroGainStrip}>
            {arrow}{' '}
            <Text style={{ color: deltaColor }}>
              {formatCentsToMoney(Math.abs(totalGain), currency)}
            </Text>
            {' '}({deltaPct}%) · ALL TIME
          </Text>

          {/* Real sparkline — only shown when we have ≥2 real data points */}
          {hasEnoughData && (
            <View style={styles.heroSparkline}>
              <InvestmentLineChart
                data={sparkPoints}
                height={80}
                variant="sparkline"
                tintColor={deltaColor}
                fillOpacity={0.10}
              />
            </View>
          )}
        </Card>

        {/* Load error */}
        {loadError && (
          <Card variant="elevated" style={styles.errorCard}>
            <Text style={styles.errorText}>
              Could not load investments. Check your connection and try again.
            </Text>
          </Card>
        )}

        {/* Portfolio trend chart */}
        {!loadError && items.length > 0 && (
          <Card variant="outlined" style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>Portfolio trend</Text>

              {/* Range selector — only useful when we have data */}
              {hasEnoughData && (
                <View style={styles.rangeRow}>
                  {RANGES.map(r => (
                    <Pressable
                      key={r}
                      onPress={() => setRange(r)}
                      style={[styles.rangeChip, range === r && styles.rangeChipActive]}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={r}
                      accessibilityState={{ selected: range === r }}
                    >
                      <Text style={[styles.rangeLabel, range === r && styles.rangeLabelActive]}>
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {!hasEnoughData ? (
              /* Not enough history yet */
              <View style={styles.trendEmpty}>
                <Text style={styles.trendEmptyTitle}>No trend data yet</Text>
                <Text style={styles.trendEmptyBody}>
                  Update investment values over time to see your portfolio trend here.
                </Text>
              </View>
            ) : !hasRangedData ? (
              /* Enough overall data but nothing in this range window */
              <View style={styles.trendEmpty}>
                <Text style={styles.trendEmptyBody}>
                  No updates recorded in this period. Try a wider range.
                </Text>
              </View>
            ) : (
              <InvestmentLineChart
                data={trendPoints}
                height={180}
                currency={currency}
              />
            )}
          </Card>
        )}

        {/* Holdings */}
        {!loadError && (items.length === 0 ? (
          <Card variant="elevated">
            <Text style={styles.emptyTitle}>No investments yet</Text>
            <Text style={styles.emptyBody}>
              {"Add your first investment here. You can choose whether it counts toward this month's Invest budget."}
            </Text>
          </Card>
        ) : (
          <Card padding={false} style={styles.holdingsCard}>
            <Eyebrow color={colors.textTertiary} style={styles.holdingsEyebrow}>HOLDINGS</Eyebrow>

            {items.map((item, index) => {
              const gain      = item.current_value_cents - item.total_cost_basis_cents;
              const gainPos   = gain >= 0;
              const gainPct   = item.total_cost_basis_cents > 0
                ? (Math.abs(gain) / item.total_cost_basis_cents * 100).toFixed(1)
                : '0.0';
              const gainColor = gainPos ? colors.primary : colors.danger;
              const isLast    = index === items.length - 1;
              const catLabel  = item.category === 'Savings' ? 'Savings / Cash' : item.category;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/investment/${item.id}` as any)}
                  style={({ pressed }) => [
                    styles.holdingRow,
                    !isLast && styles.holdingRowBorder,
                    pressed && styles.holdingRowPressed,
                  ]}
                >
                  <View style={styles.holdingAvatar}>
                    <Text style={styles.holdingAvatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.holdingMiddle}>
                    <Headline numberOfLines={1}>{item.name}</Headline>
                    <Text style={styles.holdingMeta} numberOfLines={1}>
                      {catLabel}{' · '}{formatDateDisplay(item.opening_date)}
                    </Text>
                  </View>

                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>
                      {formatCentsToMoney(item.current_value_cents, currency)}
                    </Text>
                    <Text style={[styles.holdingGain, { color: gainColor }]}>
                      {gainPos ? '+' : '-'}{gainPct}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ))}

      </AppScreen>

      <FabButton
        onPress={() => router.push('/investment-new' as any)}
        accessibilityLabel="Add investment"
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top bar ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing[2],
  },
  topEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.keep,
    marginBottom: 3,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
  countPill: {
    backgroundColor: colors.keepSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.keep,
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroCard: {
    marginTop:    spacing[5],
    marginBottom: spacing[4],
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    marginTop:     spacing[3],
    marginBottom:  spacing[2],
  },
  heroCurrencySymbol: {
    fontSize:    18,
    color:       colors.textTertiary,
    marginTop:   spacing[1],
    marginRight: 2,
  },
  heroGainStrip: {
    fontFamily:    fonts.mono,
    fontSize:      12,
    letterSpacing: 0.8,
    color:         colors.textTertiary,
    marginBottom:  spacing[2],
  },
  heroSparkline: {
    marginTop: spacing[3],
  },

  // ── Trend chart ────────────────────────────────────────────────────────────
  trendCard: {
    marginBottom: spacing[4],
    paddingBottom: spacing[4],
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  trendTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  rangeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rangeChipActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary + '60',
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rangeLabelActive: {
    color: colors.primary,
  },
  trendEmpty: {
    paddingVertical: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  trendEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  trendEmptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorCard: {
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
    lineHeight: 20,
  },

  // ── Holdings ───────────────────────────────────────────────────────────────
  holdingsCard: {
    marginBottom: spacing[6],
    overflow: 'hidden',
  },
  holdingsEyebrow: {
    paddingHorizontal: spacing[5],
    paddingTop:        spacing[5],
    paddingBottom:     spacing[3],
  },
  holdingRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[3],
    gap:               spacing[3],
  },
  holdingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  holdingRowPressed: {
    opacity:   0.6,
    transform: [{ scale: 0.99 }],
  },
  holdingAvatar: {
    width:           36,
    height:          36,
    borderRadius:    12,
    backgroundColor: colors.surfaceSoft,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  holdingAvatarText: {
    fontFamily: fonts.semiBold,
    fontSize:   16,
    color:      colors.text,
  },
  holdingMiddle: {
    flex:     1,
    minWidth: 0,
  },
  holdingMeta: {
    fontFamily:    fonts.mono,
    fontSize:      11,
    letterSpacing: 0.3,
    color:         colors.textTertiary,
    marginTop:     3,
  },
  holdingRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  holdingValue: {
    fontFamily:    fonts.bold,
    fontSize:      16,
    fontVariant:   ['tabular-nums'],
    color:         colors.text,
    letterSpacing: -0.3,
  },
  holdingGain: {
    fontFamily:    fonts.mono,
    fontSize:      11,
    letterSpacing: 0.3,
    marginTop:     2,
  },

  // ── Empty ──────────────────────────────────────────────────────────────────
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[2],
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
