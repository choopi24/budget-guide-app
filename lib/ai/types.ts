import type { SupportedCurrency } from '../../db/settings';
import type { BudgetGrade } from '../grade';

// ── Data-fetch intermediaries (used by db/aiAnalysis.ts and buildAnalysisInput) ──

/** One closed month's snapshot — fetched from SQLite with a pre-computed grade. */
export type MonthSnapshot = {
  monthKey: string;
  incomeCents: number;
  mustBudgetCents: number;
  mustSpentCents: number;
  wantBudgetCents: number;
  wantSpentCents: number;
  keepBudgetCents: number;
  investSpentCents: number;
  grade: BudgetGrade;
};

/** One raw expense row — used to build merchant summaries and pattern signals. */
export type ExpenseSample = {
  title: string;
  amountCents: number;
  bucket: 'must' | 'want';
  spentOn: string;  // ISO date "YYYY-MM-DD"
};

// ── Analysis input ─────────────────────────────────────────────────────────────

export type MonthPhase = 'early' | 'mid' | 'late';

export type MonthProgress = {
  dayOfMonth: number;
  daysInMonth: number;
  /** How far through the month we are, 0–100. */
  progressPct: number;
  phase: MonthPhase;
};

export type BucketStatus = 'under' | 'on_track' | 'at_risk' | 'over';

export type BucketSignal = {
  bucket: 'must' | 'want' | 'invest';
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  /** Actual usage percentage so far, 0–∞. */
  usedPct: number;
  /**
   * Extrapolated end-of-month percentage. Null when <10% of the month has
   * elapsed — too early to project reliably.
   */
  projectedPct: number | null;
  status: BucketStatus;
};

/** A merchant/description seen ≥1 time this month, aggregated for pattern use. */
export type MerchantSummary = {
  title: string;
  count: number;
  totalCents: number;
  bucket: 'must' | 'want';
};

/** Month-over-month delta vs the most-recent closed month. */
export type PriorMonthDelta = {
  priorMonthKey: string;
  /**
   * Positive = on pace to spend more than prior month by end of month.
   * Computed as (current projectedPct ?? usedPct) minus prior final usedPct
   * so the comparison is pace-based, not raw-balance-based.
   */
  mustUsedPctDelta: number;
  wantUsedPctDelta: number;
  gradeFrom: BudgetGrade;
  gradeTo: BudgetGrade;
};

/**
 * The canonical input type for the analysis provider.
 *
 * Produced by lib/ai/buildAnalysisInput.ts from raw SQLite data.
 * All derived fields (grades, projections, deltas) are pre-computed so
 * both the mock provider and a future remote backend receive the same
 * compact, intentional payload.
 */
export type AnalysisInput = {
  monthKey: string;
  userName?: string;
  /** User's configured currency — used to format amounts in generated text. */
  currency: SupportedCurrency;

  monthProgress: MonthProgress;
  incomeCents: number;

  /**
   * Three entries in order: must, want, invest.
   * Use bucketSignals.find(s => s.bucket === 'must') to access by name.
   */
  bucketSignals: BucketSignal[];

  totalBudgetCents: number;
  totalSpentCents: number;
  /** Income minus total spent — can be negative. */
  totalRemainingCents: number;

  currentGrade: BudgetGrade;
  /** Up to 3 prior grades, newest first. Empty if this is the first month. */
  priorGrades: BudgetGrade[];

  /** Up to 5 most-frequent/expensive merchants this month. */
  topMerchants: MerchantSummary[];

  /** Absent if no prior closed month exists. */
  priorMonthDelta?: PriorMonthDelta;

  /** ISO timestamp when the input was built — useful for debugging. */
  builtAt: string;
};

// ── Analysis output ────────────────────────────────────────────────────────────

export type BehaviorPattern = {
  label: string;
  detail: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

export type BudgetRisk = {
  area: 'must' | 'want' | 'savings' | 'income' | 'general';
  severity: 'low' | 'medium' | 'high';
  description: string;
};

export type BudgetSuggestion = {
  title: string;
  detail: string;
  savingEstimateCents?: number;
};

export type BudgetAnalysisResponse = {
  summary: string;
  behaviorPatterns: BehaviorPattern[];
  risks: BudgetRisk[];
  suggestions: BudgetSuggestion[];
  encouragement: string;
  /** Null when the user has an S grade. */
  scoreImpactNote: string | null;
  generatedAt: string;
};
