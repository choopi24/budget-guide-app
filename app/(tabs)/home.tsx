import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useHomeDb, type HomeData } from '../../db/home';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { getMonthLabelFromKey } from '../../lib/date';
import {
  buildGradeExplanation,
  computeBudgetGrade,
  GRADE_COLOR,
  type BudgetGrade,
  type GradeExplanation,
} from '../../lib/grade';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';

type RowItem = {
  label: string;
  hint: string;
  used: number;
  planned: number;
  color: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { getActiveMonthHomeData } = useHomeDb();
  const { getCurrency } = useSettingsDb();

  const [month, setMonth]           = useState<HomeData | null>(null);
  const [currency, setCurrency]     = useState<SupportedCurrency>('ILS');
  const [grade, setGrade]           = useState<BudgetGrade | null>(null);
  const [gradeExp, setGradeExp]     = useState<GradeExplanation | null>(null);
  const [showGradeExp, setShowGradeExp] = useState(false);

  const load = useCallback(async () => {
    const [monthData, savedCurrency] = await Promise.all([
      getActiveMonthHomeData(),
      getCurrency(),
    ]);
    setMonth(monthData ?? null);
    setCurrency(savedCurrency);
    if (monthData) {
      const g = computeBudgetGrade(
        monthData.must_spent_cents,
        monthData.must_budget_cents,
        monthData.want_spent_cents,
        monthData.want_budget_cents,
        monthData.invest_spent_cents,
        monthData.keep_budget_cents,
      );
      setGrade(g);
      setGradeExp(buildGradeExplanation(
        g,
        monthData.must_spent_cents,
        monthData.must_budget_cents,
        monthData.want_spent_cents,
        monthData.want_budget_cents,
        monthData.invest_spent_cents,
        monthData.keep_budget_cents,
      ));
    }
  }, [getActiveMonthHomeData, getCurrency]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!month) {
    return (
      <AppScreen scroll>
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>Dashboard</Text>
          <Text style={styles.pageTitle}>Budget</Text>
        </View>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No active month</Text>
          <Text style={styles.emptyText}>
            Set up this month to unlock your budget dashboard and start tracking.
          </Text>
          <Pressable
            onPress={() => router.push('/month-setup' as any)}
            style={({ pressed }) => [styles.emptyBtn, pressed && styles.emptyBtnPressed]}
          >
            <Text style={styles.emptyBtnText}>Set up this month</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  const rows: RowItem[] = [
    {
      label: 'Must',
      hint: 'Rent, groceries, bills',
      used: month.must_spent_cents,
      planned: month.must_budget_cents,
      color: colors.must,
    },
    {
      label: 'Want',
      hint: 'Food out, shopping, fun',
      used: month.want_spent_cents,
      planned: month.want_budget_cents,
      color: colors.want,
    },
    {
      label: 'Invest',
      hint: 'Savings and future goals',
      used: month.invest_spent_cents,
      planned: month.keep_budget_cents,
      color: colors.keep,
    },
  ];

  const totalSpent = month.must_spent_cents + month.want_spent_cents + month.invest_spent_cents;
  const spendLeft = month.income_cents - totalSpent;

  return (
    <View style={{ flex: 1 }}>
      <AppScreen scroll>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.eyebrow}>{getMonthLabelFromKey(month.month_key)}</Text>
              <Text style={styles.pageTitle}>Budget</Text>
            </View>
            <View style={styles.heroTopRight}>
              {grade && (
                <Pressable
                  onPress={() => setShowGradeExp(v => !v)}
                  style={({ pressed }) => [
                    styles.gradeBadge,
                    { backgroundColor: GRADE_COLOR[grade] + '18' },
                    pressed && { opacity: 0.7 },
                  ]}
                  hitSlop={8}
                >
                  <Text style={[styles.gradeText, { color: GRADE_COLOR[grade] }]}>{grade}</Text>
                  <Ionicons
                    name={showGradeExp ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={GRADE_COLOR[grade]}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push('/expenses' as any)}
                style={({ pressed }) => [styles.viewAllButton, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.viewAllText}>All expenses</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.heroAmount}>
            {formatCentsToMoney(month.income_cents, currency)}
          </Text>
          <Text style={styles.heroSubtext}>Net income this month</Text>

          <View style={styles.divider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(totalSpent, currency)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Left</Text>
              <Text style={[styles.statValue, spendLeft < 0 && { color: colors.danger }]}>
                {formatCentsToMoney(Math.abs(spendLeft), currency)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Invested</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(month.invest_spent_cents, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Grade explanation (shown when badge is tapped) ── */}
        {showGradeExp && grade && gradeExp && (
          <View style={[styles.gradeExpCard, { borderLeftColor: GRADE_COLOR[grade] }]}>
            <Text style={[styles.gradeExpHeader, { color: GRADE_COLOR[grade] }]}>
              Grade {grade}
            </Text>
            {gradeExp.reasons.map((r, i) => (
              <View key={i} style={styles.gradeExpRow}>
                <Ionicons name="ellipse" size={5} color={GRADE_COLOR[grade]} style={styles.gradeExpDot} />
                <Text style={styles.gradeExpReason}>{r}</Text>
              </View>
            ))}
            {gradeExp.improve && (
              <View style={styles.gradeExpImproveRow}>
                <Ionicons name="arrow-up-circle-outline" size={13} color={GRADE_COLOR[grade]} />
                <Text style={[styles.gradeExpImprove, { color: GRADE_COLOR[grade] }]}>
                  {gradeExp.improve}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Breakdown ── */}
        <Text style={styles.sectionTitle}>Breakdown</Text>

        {rows.map((row) => {
          const progress =
            row.planned > 0 ? Math.min((row.used / row.planned) * 100, 100) : 0;
          const overBudget = row.used > row.planned && row.planned > 0;

          return (
            <View key={row.label} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={[styles.rowDot, { backgroundColor: row.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{row.label}</Text>
                  <Text style={styles.rowHint}>{row.hint}</Text>
                </View>
                <View style={styles.amountBlock}>
                  <Text style={[styles.amountMain, overBudget && { color: colors.danger }]}>
                    {formatCentsToMoney(row.used, currency)}
                  </Text>
                  <Text style={styles.amountSecondary}>
                    / {formatCentsToMoney(row.planned, currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${progress}%` as any,
                      backgroundColor: overBudget ? colors.danger : row.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </AppScreen>

      {/* ── FAB ── */}
      <Pressable
        onPress={() => router.push('/expense-new' as any)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroTopRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  viewAllButton: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gradeText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Grade explanation card ────────────────────────────────────────────
  gradeExpCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderLeftWidth: 3,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 18,
    marginBottom: 14,
    gap: 6,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gradeExpHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  gradeExpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeExpDot: {
    marginTop: 1,
    flexShrink: 0,
  },
  gradeExpReason: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  gradeExpImproveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  gradeExpImprove: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  // ── Breakdown ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  rowDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rowHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amountMain: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  amountSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },

  // ── Empty state ───────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyBtnPressed: { opacity: 0.88 },
  emptyBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── FAB ──────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
