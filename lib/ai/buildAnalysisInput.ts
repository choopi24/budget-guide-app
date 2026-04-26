/**
 * Transformation layer: raw SQLite data → AnalysisInput.
 *
 * All derivation (grade computation, projections, merchant aggregation,
 * month progress) lives here so neither the screen nor the provider
 * needs to duplicate business logic.
 *
 * Reuses:
 *   - computeBudgetGrade / applyConsecutiveBonus  (lib/grade.ts)
 *   - HomeData shape                              (db/home.ts)
 *   - MonthSnapshot / ExpenseSample               (lib/ai/types.ts)
 */

import type { SupportedCurrency } from '../../db/settings';
import type { HomeData } from '../../db/home';
import { applyConsecutiveBonus, computeBudgetGrade, type BudgetGrade } from '../grade';
import type {
  AnalysisInput,
  BucketSignal,
  BucketStatus,
  ExpenseSample,
  MerchantSummary,
  MonthPhase,
  MonthProgress,
  MonthSnapshot,
  PriorMonthDelta,
} from './types';

// ── Month progress ─────────────────────────────────────────────────────────────

function daysInMonthForKey(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  // new Date(year, month, 0) = last day of the given month (month is 1-based here)
  return new Date(y, m, 0).getDate();
}

function buildMonthProgress(monthKey: string, today: Date): MonthProgress {
  const dayOfMonth  = today.getDate();
  const totalDays   = daysInMonthForKey(monthKey);
  const progressPct = Math.min(100, Math.round((dayOfMonth / totalDays) * 100));
  const phase: MonthPhase = progressPct < 34 ? 'early' : progressPct < 67 ? 'mid' : 'late';
  return { dayOfMonth, daysInMonth: totalDays, progressPct, phase };
}

// ── Bucket signal ──────────────────────────────────────────────────────────────

function buildBucketSignal(
  bucket: 'must' | 'want' | 'invest',
  budgetCents: number,
  spentCents: number,
  progressPct: number,
): BucketSignal {
  const usedPct        = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;
  const remainingCents = budgetCents - spentCents;

  // Cap at 300 to prevent absurd projections from a single early large purchase
  const projectedPct: number | null =
    progressPct >= 10 && budgetCents > 0
      ? Math.min(300, Math.round((spentCents / (progressPct / 100)) / budgetCents * 100))
      : null;

  let status: BucketStatus;
  if (usedPct > 100)                                         status = 'over';
  else if (usedPct > 88)                                     status = 'at_risk';
  else if (projectedPct != null && projectedPct > 105)       status = 'at_risk';
  else if (usedPct < 25 && progressPct > 65)                 status = 'under';
  else                                                       status = 'on_track';

  return { bucket, budgetCents, spentCents, remainingCents, usedPct, projectedPct, status };
}

// ── Merchant aggregation ───────────────────────────────────────────────────────

/**
 * Normalize a merchant title for grouping:
 *   - lowercase + trim
 *   - strip apostrophes, hyphens, periods, commas (handles "McDonald's" = "mcdonalds")
 *   - collapse multiple spaces into one
 *
 * Intentionally simple — no NLP. A backend can do semantic clustering on top of
 * the raw `title` field (also preserved in MerchantSummary).
 */
function normalizeMerchantKey(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['\u2018\u2019\-.,]/g, '')  // apostrophes (straight + curly), hyphens, periods, commas
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTopMerchants(expenses: ExpenseSample[]): MerchantSummary[] {
  const map = new Map<string, MerchantSummary>();

  for (const e of expenses) {
    const key      = normalizeMerchantKey(e.title);
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.totalCents += e.amountCents;
    } else {
      map.set(key, { title: e.title.trim(), count: 1, totalCents: e.amountCents, bucket: e.bucket });
    }
  }

  // Sort by frequency first; break ties by total spend
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.totalCents - a.totalCents)
    .slice(0, 5);
}

// ── Prior-month delta ──────────────────────────────────────────────────────────

function buildPriorMonthDelta(
  mustSignal:    BucketSignal,
  wantSignal:    BucketSignal,
  currentGrade:  BudgetGrade,
  prior:         MonthSnapshot,
): PriorMonthDelta {
  const priorMustFinalPct = prior.mustBudgetCents > 0
    ? Math.round((prior.mustSpentCents / prior.mustBudgetCents) * 100) : 0;
  const priorWantFinalPct = prior.wantBudgetCents > 0
    ? Math.round((prior.wantSpentCents / prior.wantBudgetCents) * 100) : 0;

  // Compare current PACE (projected end-of-month) vs prior FINAL spend.
  // Falls back to raw usedPct when projectedPct isn't available yet (early month).
  const currentMustPace = mustSignal.projectedPct ?? mustSignal.usedPct;
  const currentWantPace = wantSignal.projectedPct ?? wantSignal.usedPct;

  return {
    priorMonthKey:    prior.monthKey,
    mustUsedPctDelta: currentMustPace - priorMustFinalPct,
    wantUsedPctDelta: currentWantPace - priorWantFinalPct,
    gradeFrom:        prior.grade,
    gradeTo:          currentGrade,
  };
}

// ── Public builder ─────────────────────────────────────────────────────────────

export type BuildAnalysisInputParams = {
  homeData: HomeData;
  /**
   * Prior closed months with pre-computed grades (from db/aiAnalysis.ts),
   * newest first, up to 3.
   */
  priorMonths: MonthSnapshot[];
  recentExpenses: ExpenseSample[];
  userName?: string;
  /** User's configured currency — forwarded into AnalysisInput for text formatting. */
  currency: SupportedCurrency;
  /** Defaults to now. Injectable for testing. */
  today?: Date;
};

export function buildAnalysisInput(params: BuildAnalysisInputParams): AnalysisInput {
  const { homeData, priorMonths, recentExpenses, userName, currency } = params;
  const today        = params.today ?? new Date();
  const monthProgress = buildMonthProgress(homeData.month_key, today);

  // ── Grade — apply consecutive S-bonus across the full chain ───────────────
  // applyConsecutiveBonus expects oldest→newest; priorMonths is newest-first
  const priorGradesAsc = [...priorMonths].reverse().map((m) => m.grade);
  const baseGrade = computeBudgetGrade(
    homeData.must_spent_cents,
    homeData.must_budget_cents,
    homeData.want_spent_cents,
    homeData.want_budget_cents,
    homeData.invest_spent_cents,
    homeData.keep_budget_cents,
  );
  const bonusedChain = applyConsecutiveBonus([...priorGradesAsc, baseGrade]);
  const currentGrade = bonusedChain[bonusedChain.length - 1];

  // ── Per-bucket signals ─────────────────────────────────────────────────────
  const mustSignal   = buildBucketSignal('must',   homeData.must_budget_cents,  homeData.must_spent_cents,   monthProgress.progressPct);
  const wantSignal   = buildBucketSignal('want',   homeData.want_budget_cents,  homeData.want_spent_cents,   monthProgress.progressPct);
  const investSignal = buildBucketSignal('invest', homeData.keep_budget_cents,  homeData.invest_spent_cents, monthProgress.progressPct);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalBudgetCents    = homeData.must_budget_cents + homeData.want_budget_cents + homeData.keep_budget_cents;
  const totalSpentCents     = homeData.must_spent_cents  + homeData.want_spent_cents  + homeData.invest_spent_cents;
  const totalRemainingCents = homeData.income_cents - totalSpentCents;

  return {
    monthKey:          homeData.month_key,
    userName,
    currency,
    monthProgress,
    incomeCents:       homeData.income_cents,
    bucketSignals:     [mustSignal, wantSignal, investSignal],
    totalBudgetCents,
    totalSpentCents,
    totalRemainingCents,
    currentGrade,
    priorGrades:       priorMonths.map((m) => m.grade),  // preserve newest-first
    topMerchants:      buildTopMerchants(recentExpenses),
    priorMonthDelta:   priorMonths.length > 0
      ? buildPriorMonthDelta(mustSignal, wantSignal, currentGrade, priorMonths[0])
      : undefined,
    builtAt:           today.toISOString(),
  };
}
