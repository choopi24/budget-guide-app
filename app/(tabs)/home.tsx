import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FabButton } from '../../components/ui/FabButton';
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
import { radius, shadows, spacing } from '../../theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type RowItem = {
  label: string;
  hint: string;
  used: number;
  planned: number;
  color: string;
  softColor: string;
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { getActiveMonthHomeData } = useHomeDb();
  const { getCurrency } = useSettingsDb();

  const [month, setMonth]               = useState<HomeData | null>(null);
  const [currency, setCurrency]         = useState<SupportedCurrency>('ILS');
  const [grade, setGrade]               = useState<BudgetGrade | null>(null);
  const [gradeExp, setGradeExp]         = useState<GradeExplanation | null>(null);
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!month) {
    return (
      <AppScreen scroll>
        <View style={styles.emptyWrap}>
          <Card variant="elevated">
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No active month</Text>
            <Text style={styles.emptyBody}>
              Set up this month to unlock your budget dashboard and start tracking.
            </Text>
            <Button
              label="Set up this month"
              onPress={() => router.push('/month-setup' as any)}
              style={{ marginTop: spacing[6] }}
            />
          </Card>
        </View>
      </AppScreen>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const rows: RowItem[] = [
    {
      label: 'Must',
      hint:  'Rent, groceries, bills',
      used:       month.must_spent_cents,
      planned:    month.must_budget_cents,
      color:      colors.must,
      softColor:  colors.mustSoft,
    },
    {
      label: 'Want',
      hint:  'Food out, shopping, fun',
      used:       month.want_spent_cents,
      planned:    month.want_budget_cents,
      color:      colors.want,
      softColor:  colors.wantSoft,
    },
    {
      label: 'Invest',
      hint:  'Savings and future goals',
      used:       month.invest_spent_cents,
      planned:    month.keep_budget_cents,
      color:      colors.keep,
      softColor:  colors.keepSoft,
    },
  ];

  const totalSpent   = month.must_spent_cents + month.want_spent_cents + month.invest_spent_cents;
  const spendLeft    = month.income_cents - totalSpent;
  const isOverBudget = spendLeft < 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <AppScreen scroll>

        {/* ── Top bar: month label + grade badge ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topEyebrow}>Budget</Text>
            <Text style={styles.topMonth}>{getMonthLabelFromKey(month.month_key)}</Text>
          </View>

          {grade && (
            <Pressable
              onPress={() => setShowGradeExp(v => !v)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.gradeBadge,
                { backgroundColor: GRADE_COLOR[grade] + '18' },
                pressed && styles.gradeBadgePressed,
              ]}
            >
              <Text style={[styles.gradeBadgeText, { color: GRADE_COLOR[grade] }]}>
                {grade}
              </Text>
              <Ionicons
                name={showGradeExp ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={GRADE_COLOR[grade]}
              />
            </Pressable>
          )}
        </View>

        {/* ── Hero: remaining budget ── */}
        <View style={styles.hero}>
          <Text style={[styles.heroEyebrow, isOverBudget && { color: colors.danger }]}>
            {isOverBudget ? 'Over budget' : 'Left this month'}
          </Text>
          <Text style={[styles.heroAmount, isOverBudget && { color: colors.danger }]}>
            {formatCentsToMoney(Math.abs(spendLeft), currency)}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaSpent}>
              {formatCentsToMoney(totalSpent, currency)} spent
            </Text>
            <View style={styles.heroMetaDot} />
            <Text style={styles.heroMetaIncome}>
              {formatCentsToMoney(month.income_cents, currency)} income
            </Text>
          </View>
        </View>

        {/* ── Grade explanation panel ── */}
        {showGradeExp && grade && gradeExp && (
          <View style={[styles.gradePanel, { borderColor: GRADE_COLOR[grade] + '40' }]}>
            <View style={styles.gradePanelHeader}>
              <View style={[styles.gradePanelDot, { backgroundColor: GRADE_COLOR[grade] }]} />
              <Text style={[styles.gradePanelTitle, { color: GRADE_COLOR[grade] }]}>
                Grade {grade}
              </Text>
            </View>
            {gradeExp.reasons.map((r, i) => (
              <View key={i} style={styles.gradePanelRow}>
                <Ionicons name="remove" size={12} color={colors.textTertiary} style={styles.gradePanelBullet} />
                <Text style={styles.gradePanelReason}>{r}</Text>
              </View>
            ))}
            {gradeExp.improve && (
              <View style={[styles.gradePanelImprove, { borderTopColor: GRADE_COLOR[grade] + '25' }]}>
                <Ionicons name="arrow-up-circle-outline" size={14} color={GRADE_COLOR[grade]} />
                <Text style={[styles.gradePanelImproveText, { color: GRADE_COLOR[grade] }]}>
                  {gradeExp.improve}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>Breakdown</Text>

        {/* ── Breakdown: single grouped card ── */}
        <Card variant="outlined" padding={false} style={styles.breakdownCard}>
          {rows.map((row, index) => {
            const progress   = row.planned > 0 ? Math.min((row.used / row.planned) * 100, 100) : 0;
            const overBudget = row.used > row.planned && row.planned > 0;

            return (
              <View key={row.label}>
                {index > 0 && <View style={styles.rowDivider} />}

                <View style={styles.breakdownRow}>
                  {/* Label + hint */}
                  <View style={styles.rowLabelGroup}>
                    <View style={[styles.rowDot, { backgroundColor: row.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <Text style={styles.rowHint}>{row.hint}</Text>
                    </View>
                  </View>

                  {/* Amount */}
                  <View style={styles.rowAmounts}>
                    <Text style={[styles.rowAmountMain, overBudget && { color: colors.danger }]}>
                      {formatCentsToMoney(row.used, currency)}
                    </Text>
                    <Text style={styles.rowAmountOf}>
                      of {formatCentsToMoney(row.planned, currency)}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.rowTrackWrap}>
                    <View style={[styles.rowTrack, { backgroundColor: row.softColor }]}>
                      <View
                        style={[
                          styles.rowFill,
                          {
                            width: `${progress}%` as any,
                            backgroundColor: overBudget ? colors.danger : row.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── All expenses link ── */}
        <Pressable
          onPress={() => router.push('/expenses' as any)}
          style={({ pressed }) => [
            styles.allExpenses,
            pressed && styles.allExpensesPressed,
          ]}
        >
          <Text style={styles.allExpensesText}>View all expenses</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
        </Pressable>

      </AppScreen>

      <FabButton
        onPress={() => router.push('/expense-new' as any)}
        accessibilityLabel="Add new expense"
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing[1],
  },
  topEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textTertiary,   // neutral — no longer competes with hero
    marginBottom: 3,
  },
  topMonth: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  gradeBadgePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingTop:        spacing[10],   // 40 — generous air above the number
    paddingBottom:     spacing[10],   // 40 — generous air below
    paddingHorizontal: spacing[1],
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  heroAmount: {
    fontSize: 56,                     // dominant — largest element on screen
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2.5,
    lineHeight: 62,
    marginBottom: spacing[4],         // 16 — clear gap before meta
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  heroMetaSpent: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,          // secondary — noticeable but not competing
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  heroMetaIncome: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textTertiary,       // tertiary — clearly supporting info
  },

  // ── Grade panel ───────────────────────────────────────────────────────────
  gradePanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical:   spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[5],
    gap: spacing[2],
    ...shadows.sm,
  },
  gradePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  gradePanelDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  gradePanelTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  gradePanelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  gradePanelBullet: {
    marginTop: 3,
    flexShrink: 0,
  },
  gradePanelReason: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  gradePanelImprove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gradePanelImproveText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textTertiary,       // demoted — structural, not content
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },

  // ── Breakdown card + rows ─────────────────────────────────────────────────
  breakdownCard: {
    overflow: 'hidden',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing[5],
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing[5],    // 20
    paddingVertical:   spacing[5],    // 20 — more room per row
    gap: 0,
  },
  rowLabelGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
  },
  rowHint: {
    fontSize: 12,
    color: colors.textTertiary,       // barely-there — context without noise
    marginTop: 2,
    lineHeight: 16,
  },
  rowAmounts: {
    alignItems: 'flex-end',
  },
  rowAmountMain: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  rowAmountOf: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  rowTrackWrap: {
    width: '100%',
    marginTop: spacing[3],
  },
  rowTrack: {
    height: 5,                        // slightly thicker — better visual weight
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  rowFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  // ── All expenses link ─────────────────────────────────────────────────────
  allExpenses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[6],      // 24
  },
  allExpensesPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.98 }],
  },
  allExpensesText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing[10],
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    alignSelf: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },

});
