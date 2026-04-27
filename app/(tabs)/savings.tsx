import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/ui/Card';
import { FabButton } from '../../components/ui/FabButton';
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

  const [items, setItems]       = useState<InvestmentItem[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  const load = useCallback(async () => {
    const [result, savedCurrency] = await Promise.all([
      getInvestmentsList(),
      getCurrency(),
    ]);
    setItems(result as InvestmentItem[]);
    setCurrency(savedCurrency);
  }, [getInvestmentsList, getCurrency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalCurrent   = items.reduce((sum, item) => sum + item.current_value_cents, 0);
  const totalCostBasis = items.reduce((sum, item) => sum + item.total_cost_basis_cents, 0);
  const totalGain      = totalCurrent - totalCostBasis;
  const isPositive   = totalGain >= 0;

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

        {/* ── Hero: current portfolio value ── */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Current value</Text>
          <Text style={styles.heroAmount}>
            {formatCentsToMoney(totalCurrent, currency)}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>
              {formatCentsToMoney(totalCostBasis, currency)} invested
            </Text>
            <View style={styles.heroMetaDot} />
            <Text style={[styles.heroMetaGain, isPositive ? styles.positive : styles.negative]}>
              {isPositive ? '+' : '−'}
              {formatCentsToMoney(Math.abs(totalGain), currency)}
            </Text>
          </View>
        </View>

        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>Holdings</Text>

        {/* ── Investment list ── */}
        {items.length === 0 ? (
          <Card variant="elevated">
            <Text style={styles.emptyTitle}>No investments yet</Text>
            <Text style={styles.emptyBody}>
              Add a new investment manually, or document one directly from an expense.
            </Text>
          </Card>
        ) : (
          <Card variant="outlined" padding={false} style={styles.listCard}>
            {items.map((item, index) => {
              const gain       = item.current_value_cents - item.total_cost_basis_cents;
              const gainPos    = gain >= 0;

              return (
                <View key={item.id}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <Pressable
                    onPress={() => router.push(`/investment/${item.id}` as any)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {item.category} · {formatDateDisplay(item.opening_date)}
                      </Text>
                    </View>

                    <View style={styles.rowRight}>
                      <Text style={styles.rowValue}>
                        {formatCentsToMoney(item.current_value_cents, currency)}
                      </Text>
                      <Text style={[styles.rowGain, gainPos ? styles.positive : styles.negative]}>
                        {gainPos ? '+' : '−'}
                        {formatCentsToMoney(Math.abs(gain), currency)}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={14} color={colors.border} style={styles.rowChevron} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}

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
  hero: {
    paddingTop: spacing[8],      // 32
    paddingBottom: spacing[8],   // 32
    paddingHorizontal: spacing[1],
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
    color: colors.textInverse,
    letterSpacing: -2,
    lineHeight: 54,
    marginBottom: spacing[3],
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  heroMetaGain: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  positive: { color: colors.primary },
  negative: { color: colors.danger },

  // ── Section label ────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },

  // ── Holdings list ────────────────────────────────────────────────────────────
  listCard: {
    overflow: 'hidden',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing[5],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  rowPressed: { opacity: 0.6, transform: [{ scale: 0.99 }] },
  rowLeft: { flex: 1, minWidth: 0 },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  rowRight:  { alignItems: 'flex-end' },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.text,
    letterSpacing: -0.2,
  },
  rowGain: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  rowChevron: { flexShrink: 0 },

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
