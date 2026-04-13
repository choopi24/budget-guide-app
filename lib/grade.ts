export type BudgetGrade = 'S' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Compute the base grade for a single month.
 * S is intentionally excluded here — it is only awarded retroactively
 * when this month AND the previous month both achieved A+ (see applyConsecutiveBonus).
 */
export function computeBudgetGrade(
  mustSpent: number,
  mustBudget: number,
  wantSpent: number,
  wantBudget: number,
): BudgetGrade {
  const totalBudget = mustBudget + wantBudget;
  if (totalBudget === 0) return 'A';
  const ratio = (mustSpent + wantSpent) / totalBudget;
  if (ratio <= 0.92) return 'A+';
  if (ratio <= 1.00) return 'A';
  if (ratio <= 1.10) return 'B';
  if (ratio <= 1.22) return 'C';
  if (ratio <= 1.40) return 'D';
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

export const GRADE_COLOR: Record<BudgetGrade, string> = {
  S: '#4C79B5',
  'A+': '#2F7D57',
  A: '#3E8B63',
  B: '#D48A3C',
  C: '#D06020',
  D: '#B6523A',
  F: '#8B2518',
};
