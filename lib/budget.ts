// Pure budget-math helpers — no React, no DB, fully testable.

export type BucketAmounts = {
  mustBudgetCents:  number;
  mustSpentCents:   number;
  wantBudgetCents:  number;
  wantSpentCents:   number;
  keepBudgetCents:  number;
  investSpentCents: number;
};

export type RolloverTargets = {
  mustRolloverTarget:   string; // 'must' | 'want' | 'invest'
  wantRolloverTarget:   string;
  investRolloverTarget: string;
};

export type BucketRemainders = {
  mustRemainder:   number;
  wantRemainder:   number;
  investRemainder: number;
};

export type RolloverBonuses = {
  mustBonus: number;
  wantBonus: number;
  keepBonus: number;
};

/**
 * Compute how much is left in each bucket at the end of a month.
 * Overspending floors at 0 — it does not produce a negative rollover.
 */
export function computeRemainders(month: BucketAmounts): BucketRemainders {
  return {
    mustRemainder:   Math.max(0, month.mustBudgetCents  - month.mustSpentCents),
    wantRemainder:   Math.max(0, month.wantBudgetCents  - month.wantSpentCents),
    investRemainder: Math.max(0, month.keepBudgetCents  - month.investSpentCents),
  };
}

/**
 * Route each bucket's surplus into the destination bucket configured in settings.
 * The three remainders are distributed independently — must goes to mustTarget,
 * want goes to wantTarget, invest goes to investTarget — and then summed per
 * destination.
 */
export function computeRolloverBonuses(
  remainders: BucketRemainders,
  targets: RolloverTargets,
): RolloverBonuses {
  const { mustRemainder: mr, wantRemainder: wr, investRemainder: ir } = remainders;
  const { mustRolloverTarget: mt, wantRolloverTarget: wt, investRolloverTarget: it } = targets;

  return {
    mustBonus: (mt === 'must'   ? mr : 0) + (wt === 'must'   ? wr : 0) + (it === 'must'   ? ir : 0),
    wantBonus: (mt === 'want'   ? mr : 0) + (wt === 'want'   ? wr : 0) + (it === 'want'   ? ir : 0),
    keepBonus: (mt === 'invest' ? mr : 0) + (wt === 'invest' ? wr : 0) + (it === 'invest' ? ir : 0),
  };
}

/**
 * Compute the three base bucket budgets from income and split percentages.
 * Keep bucket absorbs any rounding leftover so the three always sum to income.
 */
export function computeBucketBudgets(
  incomeCents: number,
  split: { mustPct: number; wantPct: number },
): { mustBudgetCents: number; wantBudgetCents: number; keepBudgetCents: number } {
  const mustBudgetCents = Math.round(incomeCents * (split.mustPct / 100));
  const wantBudgetCents = Math.round(incomeCents * (split.wantPct / 100));
  return {
    mustBudgetCents,
    wantBudgetCents,
    keepBudgetCents: incomeCents - mustBudgetCents - wantBudgetCents,
  };
}
