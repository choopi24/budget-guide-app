import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HomeFab } from '../../components/ui/HomeFab';
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
import { fonts } from '../../theme/fonts';
import { radius, shadows, spacing } from '../../theme/tokens';

// ── Constants ─────────────────────────────────────────────────────────────────

const FILL_EASING = Easing.bezier(0.32, 0.72, 0, 1);

// ── Types ─────────────────────────────────────────────────────────────────────

type RowItem = {
  label: string;
  hint: string;
  used: number;
  planned: number;
  color: string;
  softColor: string;
};

type Verdict = { text: string; color: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthPace(monthKey: string): number {
  const [y, mo] = monthKey.split('-').map(Number);
  const today = new Date();
  if (today.getFullYear() !== y || today.getMonth() + 1 !== mo) return 1;
  return today.getDate() / new Date(y, mo, 0).getDate();
}

function getVerdict(used: number, planned: number, pace: number): Verdict | null {
  if (planned <= 0) return null;
  const r = used / planned;
  if (r >= 1)           return { text: 'Maxed',      color: colors.danger };
  if (r > pace + 0.10)  return { text: 'Over pace',  color: colors.want };
  if (r >= pace - 0.10) return { text: 'On track',   color: colors.textMuted };
  return                        { text: 'Ahead',      color: colors.primary };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  'use no memo';

  const router = useRouter();
  const { getActiveMonthHomeData } = useHomeDb();
  const { getCurrency } = useSettingsDb();

  const [month, setMonth]               = useState<HomeData | null>(null);
  const [currency, setCurrency]         = useState<SupportedCurrency>('ILS');
  const [grade, setGrade]               = useState<BudgetGrade | null>(null);
  const [gradeExp, setGradeExp]         = useState<GradeExplanation | null>(null);
  const [showGradeExp, setShowGradeExp] = useState(false);

  // ── Reanimated shared values for bar fill animation ──────────────────────
  const mustAnim   = useSharedValue(0);
  const wantAnim   = useSharedValue(0);
  const investAnim = useSharedValue(0);

  const mustBarStyle   = useAnimatedStyle(() => ({ flex: mustAnim.value }));
  const wantBarStyle   = useAnimatedStyle(() => ({ flex: wantAnim.value }));
  const investBarStyle = useAnimatedStyle(() => ({ flex: investAnim.value }));

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

  // Trigger bar fill animation whenever month data updates
  useEffect(() => {
    if (!month) {
      mustAnim.value   = 0;
      wantAnim.value   = 0;
      investAnim.value = 0;
      return;
    }
    const mustTarget   = month.must_budget_cents > 0
      ? Math.min(month.must_spent_cents   / month.must_budget_cents,  1) : 0;
    const wantTarget   = month.want_budget_cents > 0
      ? Math.min(month.want_spent_cents   / month.want_budget_cents,  1) : 0;
    const investTarget = month.keep_budget_cents > 0
      ? Math.min(month.invest_spent_cents / month.keep_budget_cents,  1) : 0;

    mustAnim.value   = withDelay(0,   withTiming(mustTarget,   { duration: 600, easing: FILL_EASING }));
    wantAnim.value   = withDelay(80,  withTiming(wantTarget,   { duration: 600, easing: FILL_EASING }));
    investAnim.value = withDelay(160, withTiming(investTarget, { duration: 600, easing: FILL_EASING }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

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

  const paceRatio = getMonthPace(month.month_key);

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

  const barStyles = [mustBarStyle, wantBarStyle, investBarStyle];

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
            const overBudget = row.used > row.planned && row.planned > 0;
            const fillColor  = overBudget ? colors.danger : row.color;
            const barStyle   = barStyles[index];
            const verdict    = getVerdict(row.used, row.planned, paceRatio);

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

                  {/* Progress bar + pace tick + verdict */}
                  <View style={styles.rowTrackWrap}>
                    {/* Container keeps pace tick visible outside overflow:hidden track */}
                    <View style={styles.rowTrackContainer}>
                      <View style={[styles.rowTrack, { backgroundColor: row.softColor }]}>
                        <Animated.View
                          style={[styles.rowFill, barStyle, { backgroundColor: fillColor }]}
                        />
                      </View>
                      {/* Pace tick: where you should be at today's date */}
                      {paceRatio > 0.02 && paceRatio < 0.98 && (
                        <View
                          style={[
                            styles.paceTick,
                            { left: `${paceRatio * 100}%` as any },
                          ]}
                        />
                      )}
                    </View>

                    {/* Monospace verdict readout */}
                    {verdict && (
                      <View style={styles.verdictRow}>
                        <Text style={[styles.verdictText, { color: verdict.color }]}>
                          {verdict.text}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── AI Budget Review entry ── */}
        <Pressable
          onPress={() => router.push('/ai-budget-review' as any)}
          style={({ pressed }) => [
            styles.aiReviewRow,
            pressed && styles.aiReviewRowPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open AI budget review"
        >
          <View style={styles.aiReviewIconWrap}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
          <View style={styles.aiReviewText}>
            <Text style={styles.aiReviewLabel}>AI Budget Review</Text>
            <Text style={styles.aiReviewHint}>Patterns, risks, and suggestions</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.border} />
        </Pressable>

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

      <HomeFab
        onAdd={() => router.push('/expense-new' as any)}
        onScan={() => router.push('/receipt-scan' as any)}
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
    color: colors.textTertiary,
    marginBottom: 3,
  },
  topMonth: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.textInverse,
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
    paddingTop:        spacing[10],
    paddingBottom:     spacing[10],
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
    fontSize: 56,
    fontWeight: '800',
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
    color: colors.textInverse,
    letterSpacing: -2.5,
    lineHeight: 62,
    marginBottom: spacing[4],
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  heroMetaSpent: {
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
  heroMetaIncome: {
    fontSize: 13,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    color: colors.textTertiary,
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
    color: colors.textTertiary,
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
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[5],
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
    color: colors.textTertiary,
    marginTop: 2,
    lineHeight: 16,
  },
  rowAmounts: {
    alignItems: 'flex-end',
  },
  rowAmountMain: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.text,
    letterSpacing: -0.2,
  },
  rowAmountOf: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    color: colors.textTertiary,
    marginTop: 2,
  },
  rowTrackWrap: {
    width: '100%',
    marginTop: spacing[3],
  },
  // Container lets the pace tick render outside the track's overflow:hidden
  rowTrackContainer: {
    // no overflow hidden — pace tick can poke above/below
  },
  rowTrack: {
    height: 5,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',   // flex-based fill
  },
  rowFill: {
    alignSelf: 'stretch',
    borderRadius: radius.full,
  },
  // Vertical tick at the pace position (where you should be today)
  paceTick: {
    position: 'absolute',
    top: -3,
    height: 11,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
    transform: [{ translateX: -1 }],
  },
  verdictRow: {
    marginTop: 5,
    alignItems: 'flex-start',
  },
  verdictText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── AI Budget Review entry ───────────────────────────────────────────────
  aiReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  aiReviewRowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  aiReviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiReviewText: {
    flex: 1,
  },
  aiReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  aiReviewHint: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // ── All expenses link ─────────────────────────────────────────────────────
  allExpenses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[6],
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
