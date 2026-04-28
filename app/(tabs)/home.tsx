import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow, Headline, HeroNumber } from '../../components/ui/Typography';
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

// ── Types ─────────────────────────────────────────────────────────────────────

type RowItem = {
  label: string;
  hint: string;
  used: number;
  planned: number;
  color: string;
  softColor: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthPace(monthKey: string): number {
  const [y, mo] = monthKey.split('-').map(Number);
  const today = new Date();
  if (today.getFullYear() !== y || today.getMonth() + 1 !== mo) return 1;
  return today.getDate() / new Date(y, mo, 0).getDate();
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

  const totalSpent   = month.must_spent_cents + month.want_spent_cents + month.invest_spent_cents;
  const spendLeft    = month.income_cents - totalSpent;
  const isOverBudget = spendLeft < 0;

  const currencySymbol  = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';
  const heroAmountText  = Math.floor(Math.abs(spendLeft) / 100).toLocaleString('en-US');
  const [heroY, heroMo] = month.month_key.split('-').map(Number);
  const heroToday       = new Date();
  const daysLeft        = heroToday.getFullYear() === heroY && heroToday.getMonth() + 1 === heroMo
    ? Math.max(0, new Date(heroY, heroMo, 0).getDate() - heroToday.getDate())
    : 0;
  const pctUsed    = month.income_cents > 0
    ? Math.round(totalSpent / month.income_cents * 100) : 0;
  const spendRatio = month.income_cents > 0 ? totalSpent / month.income_cents : 0;
  const paceLabel  = spendRatio > paceRatio + 0.10 ? 'OVER PACE'
    : spendRatio < paceRatio - 0.10 ? 'UNDER PACE'
    : 'ON PACE';

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

        {/* ── Meters card ── */}
        <Card padding={spacing[5]} style={styles.metersCard}>
          <View style={styles.metersTitleRow}>
            <Eyebrow color={colors.textTertiary}>THIS MONTH</Eyebrow>
            <Eyebrow color={colors.textTertiary}>{getMonthLabelFromKey(month.month_key)}</Eyebrow>
          </View>
          {rows.map((row, index) => {
            const fillPct      = row.planned > 0 ? Math.min(row.used / row.planned, 1) : 0;
            const ratio        = row.planned > 0 ? row.used / row.planned : 0;
            const overBudget   = row.used > row.planned && row.planned > 0;
            const fillColor    = overBudget ? colors.danger : row.color;
            const rowPaceLabel = ratio > paceRatio + 0.05 ? 'OVER'
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

  // ── Meters card ───────────────────────────────────────────────────────────
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
