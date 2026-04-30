import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

export default function SavingsScreen() {
  const router = useRouter();
  const { getInvestmentsList } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();

  const [items,     setItems]     = useState<InvestmentItem[]>([]);
  const [currency,  setCurrency]  = useState<SupportedCurrency>('ILS');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const [result, savedCurrency] = await Promise.all([
        getInvestmentsList(),
        getCurrency(),
      ]);
      setItems(result as InvestmentItem[]);
      setCurrency(savedCurrency);
    } catch {
      setLoadError(true);
    }
  }, [getInvestmentsList, getCurrency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalCurrent   = items.reduce((sum, item) => sum + item.current_value_cents, 0);
  const totalCostBasis = items.reduce((sum, item) => sum + item.total_cost_basis_cents, 0);
  const totalGain      = totalCurrent - totalCostBasis;
  const isPositive     = totalGain >= 0;

  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';
  const heroAmountText = Math.floor(totalCurrent / 100).toLocaleString('en-US');
  const deltaPct       = totalCostBasis > 0
    ? (Math.abs(totalGain) / totalCostBasis * 100).toFixed(1)
    : '0.0';
  const arrow          = isPositive ? '▲' : '▼';
  const deltaColor     = isPositive ? colors.primary : colors.danger;
  const sparkData      = [
    { value: totalCostBasis / 100 },
    { value: totalCurrent / 100 },
  ];

  return (
    <View style={styles.root}>
      <AppScreen scroll>

        {/* ── Top bar ── */}
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

        {/* ── Hero: portfolio value ── */}
        <Card variant="hero" style={styles.heroCard}>
          {/* Row A — eyebrow */}
          <Eyebrow color={colors.textTertiary}>PORTFOLIO VALUE</Eyebrow>

          {/* Row B — amount */}
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroCurrencySymbol}>{currencySymbol}</Text>
            <HeroNumber color={colors.surface}>{heroAmountText}</HeroNumber>
          </View>

          {/* Row C — gain strip */}
          <Text style={styles.heroGainStrip}>
            {arrow}{' '}
            <Text style={{ color: deltaColor }}>{formatCentsToMoney(Math.abs(totalGain), currency)}</Text>
            {' '}({deltaPct}%) · ALL TIME
          </Text>

          {/* Row D — sparkline */}
          <View style={styles.heroSparkline}>
            <InvestmentLineChart
              data={sparkData}
              height={80}
              variant="sparkline"
              tintColor={deltaColor}
              fillOpacity={0.10}
            />
          </View>
        </Card>

        {/* ── Load error ── */}
        {loadError && (
          <Card variant="elevated" style={styles.errorCard}>
            <Text style={styles.errorText}>Could not load investments. Check your connection and try again.</Text>
          </Card>
        )}

        {/* ── Holdings ── */}
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
                  {/* Avatar: first letter of name */}
                  <View style={styles.holdingAvatar}>
                    <Text style={styles.holdingAvatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Middle: name + meta */}
                  <View style={styles.holdingMiddle}>
                    <Headline numberOfLines={1}>{item.name}</Headline>
                    <Text style={styles.holdingMeta} numberOfLines={1}>
                      {item.category} · {formatDateDisplay(item.opening_date)}
                    </Text>
                  </View>

                  {/* Right: total value + gain % */}
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

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top bar ─────────────────────────────────────────────────────────────────
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

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroCard: {
    marginTop:    spacing[5],
    marginBottom: spacing[6],
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
    marginBottom:  spacing[4],
  },
  heroSparkline: {
    marginTop: spacing[2],
  },
  positive: { color: colors.primary },
  negative: { color: colors.danger },

  // ── Holdings list ────────────────────────────────────────────────────────────
  holdingsCard: {
    marginBottom: spacing[6],
    overflow:     'hidden',
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

  // ── Error state ──────────────────────────────────────────────────────────────
  errorCard: {
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
    lineHeight: 20,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
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
