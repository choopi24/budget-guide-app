import { computeBudgetGrade, applyConsecutiveBonus } from '../lib/grade';
import type { BudgetGrade } from '../lib/grade';

describe('computeBudgetGrade', () => {
  it('returns A+ when well within all budgets', () => {
    expect(computeBudgetGrade(3000, 5000, 1000, 3000, 1000, 1000)).toBe('A+');
  });

  it('returns F when must budget is severely overspent', () => {
    expect(computeBudgetGrade(10000, 5000, 0, 3000, 0, 1000)).toBe('F');
  });

  it('returns A for no-budget-set edge case', () => {
    expect(computeBudgetGrade(0, 0, 0, 0, 0, 0)).toBe('A');
  });

  it('penalises must overspend more than want overspend', () => {
    // Must 120 % over, want on-track
    const mustOverGrade = computeBudgetGrade(6000, 5000, 1000, 3000, 0, 0);
    // Want 120 % over, must on-track
    const wantOverGrade = computeBudgetGrade(3000, 5000, 3600, 3000, 0, 0);
    const gradeOrder: BudgetGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D', 'F'];
    expect(gradeOrder.indexOf(mustOverGrade)).toBeGreaterThan(gradeOrder.indexOf(wantOverGrade));
  });

  it('gives a bonus point for hitting the keep/invest target', () => {
    const withInvest    = computeBudgetGrade(3000, 5000, 1000, 3000, 1000, 1000);
    const withoutInvest = computeBudgetGrade(3000, 5000, 1000, 3000, 0, 1000);
    const gradeOrder: BudgetGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D', 'F'];
    expect(gradeOrder.indexOf(withInvest)).toBeLessThanOrEqual(gradeOrder.indexOf(withoutInvest));
  });

  it('handles zero keep budget without crashing', () => {
    expect(() => computeBudgetGrade(3000, 5000, 1000, 3000)).not.toThrow();
  });
});

describe('applyConsecutiveBonus', () => {
  it('upgrades two consecutive A+ months to S on the second', () => {
    const result = applyConsecutiveBonus(['A+', 'A+']);
    expect(result).toEqual(['A+', 'S']);
  });

  it('upgrades A+ after S to S as well', () => {
    const result = applyConsecutiveBonus(['A+', 'S', 'A+']);
    expect(result).toEqual(['A+', 'S', 'S']);
  });

  it('does not upgrade if the preceding month was not A+ or S', () => {
    const result = applyConsecutiveBonus(['A', 'A+']);
    expect(result).toEqual(['A', 'A+']);
  });

  it('does not upgrade a single A+ month', () => {
    const result = applyConsecutiveBonus(['A+']);
    expect(result).toEqual(['A+']);
  });

  it('leaves non-A+ grades unchanged', () => {
    const input: BudgetGrade[] = ['B', 'C', 'D', 'F'];
    expect(applyConsecutiveBonus(input)).toEqual(input);
  });

  it('handles empty array', () => {
    expect(applyConsecutiveBonus([])).toEqual([]);
  });
});
