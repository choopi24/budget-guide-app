import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useHomeDb, type HomeData } from '../../db/home';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { computeBudgetGrade, GRADE_COLOR, type BudgetGrade } from '../../lib/grade';
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

  const [month, setMonth] = useState<HomeData | null>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [grade, setGrade] = useState<BudgetGrade | null>(null);

  const load = useCallback(async () => {
    const [monthData, savedCurrency] = await Promise.all([
      getActiveMonthHomeData(),
      getCurrency(),
    ]);
    setMonth(monthData ?? null);
    setCurrency(savedCurrency);
    if (monthData) {
      setGrade(computeBudgetGrade(
        monthData.must_spent_cents,
        monthData.must_budget_cents,
        monthData.want_spent_cents,
        monthData.want_budget_cents,
      ));
    }
  }, [getActiveMonthHomeData, getCurrency]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!month) {
    return (
      <AppScreen scroll>
        <View style={styles.emptyCard}>
          <Text style={styles.eyebrow}>Budget</Text>
          <Text style={styles.pageTitle}>No active month yet</Text>
          <Text style={styles.emptyText}>
            Start your month setup to unlock the dashboard.
          </Text>
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

  const totalSpent = month.must_spent_cents + month.want_spent_cents;
  const totalPlanned =
    month.must_budget_cents + month.want_budget_cents + month.keep_budget_cents;

  return (
    <View style={{ flex: 1 }}>
      <AppScreen scroll>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.eyebrow}>This month</Text>
              <Text style={styles.pageTitle}>Budget</Text>
            </View>
            <View style={styles.heroTopRight}>
              {grade && (
                <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLOR[grade] + '18' }]}>
                  <Text style={[styles.gradeText, { color: GRADE_COLOR[grade] }]}>{grade}</Text>
                </View>
              )}
              <Pressable onPress={() => router.push('/expenses' as any)} style={styles.viewAllButton}>
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
              <Text style={styles.statLabel}>Budgeted</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(totalPlanned, currency)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Invest</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(month.keep_budget_cents, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
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

      <Pressable
        onPress={() => router.push('/expense-new' as any)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
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
    marginBottom: 20,
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
    fontWeight: '700',
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 42,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
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
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  fabText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 32,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
