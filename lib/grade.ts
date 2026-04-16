export type BudgetGrade = 'S' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

// ─── Grade colours ────────────────────────────────────────────────────────────

export const GRADE_COLOR: Record<BudgetGrade, string> = {
  S:    '#4C79B5',
  'A+': '#2F7D57',
  A:    '#3E8B63',
  B:    '#D48A3C',
  C:    '#D06020',
  D:    '#B6523A',
  F:    '#8B2518',
};

// ─── Grade explanation ────────────────────────────────────────────────────────

export type GradeExplanation = {
  /** 2–3 short bullets describing why the user earned this grade. */
  reasons: string[];
  /** One short actionable hint. Null only for a perfect S grade. */
  improve: string | null;
};

// ─── Core computation ────────────────────────────────────────────────────────

/**
 * Compute a 0–100 score for a single budget category.
 *
 * - Spending at or below 92 % of budget scores 100 (ahead of plan).
 * - Spending between 92 % and 100 % scores linearly 80–100.
 * - Spending between 100 % and 115 % scores linearly 40–80 (over budget, penalised).
 * - Spending above 115 % scores 0.
 *
 * If budget is 0, spending of 0 returns 100; any spending returns 0.
 */
function bucketScore(spent: number, budget: number): number {
  if (budget === 0) return spent === 0 ? 100 : 0;
  const ratio = spent / budget;
  if (ratio <= 0.92) return 100;
  if (ratio <= 1.00) return Math.round(80 + (1 - ratio) / 0.08 * 20);
  if (ratio <= 1.15) return Math.round(40 + (1.15 - ratio) / 0.15 * 40);
  return 0;
}

/**
 * Compute the composite grade for a single month.
 *
 * Weighting:
 *   Must: 55 % — essential costs are less discretionary; overspending here is more serious.
 *   Want: 35 % — discretionary; some flex is expected.
 *   Keep: 10 % — bonus for actually putting money toward Invest/savings.
 *
 * Score thresholds → grade:
 *   ≥ 97  → A+
 *   ≥ 88  → A
 *   ≥ 74  → B
 *   ≥ 57  → C
 *   ≥ 40  → D
 *   < 40  → F
 *
 * S is not returned here — it is awarded retroactively by applyConsecutiveBonus.
 */
export function computeBudgetGrade(
  mustSpent:   number,
  mustBudget:  number,
  wantSpent:   number,
  wantBudget:  number,
  keepSpent:   number  = 0,
  keepBudget:  number  = 0,
): BudgetGrade {
  const totalBudget = mustBudget + wantBudget + keepBudget;
  if (totalBudget === 0) return 'A';

  const mustS = bucketScore(mustSpent, mustBudget);
  const wantS = bucketScore(wantSpent, wantBudget);
  const keepS = keepBudget > 0
    ? (keepSpent >= keepBudget ? 100 : Math.round((keepSpent / keepBudget) * 100))
    : (keepSpent > 0 ? 100 : 60); // no target set but invested something → neutral-positive

  const composite = mustS * 0.55 + wantS * 0.35 + keepS * 0.10;

  if (composite >= 97) return 'A+';
  if (composite >= 88) return 'A';
  if (composite >= 74) return 'B';
  if (composite >= 57) return 'C';
  if (composite >= 40) return 'D';
  return 'F';
}

/**
 * Upgrade eligible months to S grade.
 * Input must be sorted oldest → newest (ASC by month id).
 * A month earns S when it AND the immediately preceding month were both A+ (or S).
 */
export function applyConsecutiveBonus(grades: BudgetGrade[]): BudgetGrade[] {
  const result = [...grades];
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    if (curr === 'A+' && (prev === 'A+' || prev === 'S')) {
      result[i] = 'S';
    }
  }
  return result;
}

// ─── Grade explanation ────────────────────────────────────────────────────────

/**
 * Build a human-readable explanation for the current month's grade.
 * Looks at each bucket's ratio to produce 2–3 plain-language bullets
 * and one actionable improvement hint.
 */
export function buildGradeExplanation(
  grade:       BudgetGrade,
  mustSpent:   number,
  mustBudget:  number,
  wantSpent:   number,
  wantBudget:  number,
  keepSpent:   number = 0,
  keepBudget:  number = 0,
): GradeExplanation {
  const reasons: string[] = [];

  // ── Must ──────────────────────────────────────────────────────────────────
  if (mustBudget === 0) {
    // skip — no must budget set
  } else {
    const mustRatio = mustSpent / mustBudget;
    if (mustRatio <= 0.92) {
      reasons.push('Must costs are well within budget');
    } else if (mustRatio <= 1.00) {
      reasons.push('Must spending is on track');
    } else if (mustRatio <= 1.15) {
      reasons.push(`Must spending is slightly over budget (${pct(mustRatio)} used)`);
    } else {
      reasons.push(`Must budget is significantly exceeded (${pct(mustRatio)} used)`);
    }
  }

  // ── Want ──────────────────────────────────────────────────────────────────
  if (wantBudget === 0) {
    // skip
  } else {
    const wantRatio = wantSpent / wantBudget;
    if (wantRatio <= 0.92) {
      reasons.push('Discretionary spending is under control');
    } else if (wantRatio <= 1.00) {
      reasons.push('Want spending is close to the limit');
    } else if (wantRatio <= 1.15) {
      reasons.push(`Want spending is over plan (${pct(wantRatio)} used)`);
    } else {
      reasons.push(`Discretionary spending is well over plan (${pct(wantRatio)} used)`);
    }
  }

  // ── Keep / Invest ─────────────────────────────────────────────────────────
  if (keepSpent > 0) {
    if (keepBudget > 0 && keepSpent >= keepBudget) {
      reasons.push('Full Invest target reached this month');
    } else if (keepBudget > 0) {
      reasons.push('Some money was put toward Invest');
    } else {
      reasons.push('You invested this month');
    }
  } else if (keepBudget > 0) {
    reasons.push('No Invest contribution yet this month');
  }

  // Trim to max 3 reasons
  const trimmed = reasons.slice(0, 3);

  // ── Improvement hint ──────────────────────────────────────────────────────
  const improve = buildImproveHint(grade, mustSpent, mustBudget, wantSpent, wantBudget, keepSpent, keepBudget);

  return { reasons: trimmed, improve };
}

function buildImproveHint(
  grade:      BudgetGrade,
  mustSpent:  number,
  mustBudget: number,
  wantSpent:  number,
  wantBudget: number,
  keepSpent:  number,
  keepBudget: number,
): string | null {
  if (grade === 'S') return null;

  const mustOver  = mustBudget > 0 && mustSpent > mustBudget;
  const wantOver  = wantBudget > 0 && wantSpent > wantBudget;
  const noInvest  = keepSpent === 0 && keepBudget > 0;
  const nearA     = grade === 'A' || grade === 'B';

  if (mustOver && wantOver) {
    return 'Rein in both Must and Want spending to improve your grade';
  }
  if (mustOver) {
    return 'Reducing essential costs would have the biggest impact on your grade';
  }
  if (wantOver) {
    return 'Trim discretionary spending to move up a grade';
  }
  if (noInvest) {
    return 'Even a small Invest contribution would lift your score';
  }
  if (grade === 'A+') {
    return 'Keep this pace for two months in a row to reach S';
  }
  if (nearA) {
    return 'Stay on plan for the rest of the month to reach A+';
  }
  return 'Stick to your budget plan to improve your grade';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
