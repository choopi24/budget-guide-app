import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  applyConsecutiveBonus,
  computeBudgetGrade,
} from '../lib/grade';
import type { ExpenseSample, MonthSnapshot } from '../lib/ai/types';

type RawMonth = {
  month_key: string;
  income_cents: number;
  must_budget_cents: number;
  must_spent_cents: number;
  want_budget_cents: number;
  want_spent_cents: number;
  keep_budget_cents: number;
  invest_spent_cents: number;
};

type RawExpense = {
  title: string;
  amount_cents: number;
  final_bucket: 'must' | 'want';
  spent_on: string;
};

export function useAiAnalysisDb() {
  const db = useSQLiteContext();

  /** Up to 3 most-recent closed months, newest first, with computed grades. */
  const getPriorMonths = useCallback(async (): Promise<MonthSnapshot[]> => {
    const rows = await db.getAllAsync<RawMonth>(`
      SELECT
        month_key,
        income_cents,
        must_budget_cents,
        must_spent_cents,
        want_budget_cents,
        want_spent_cents,
        keep_budget_cents,
        invest_spent_cents
      FROM months
      WHERE status = 'closed'
      ORDER BY id DESC
      LIMIT 4
    `);

    // Grades must be computed oldest→newest for the consecutive bonus, then reversed
    const ascending = [...rows].reverse();
    const baseGrades = ascending.map((r) =>
      computeBudgetGrade(
        r.must_spent_cents,
        r.must_budget_cents,
        r.want_spent_cents,
        r.want_budget_cents,
        r.invest_spent_cents,
        r.keep_budget_cents,
      )
    );
    const finalGrades = applyConsecutiveBonus(baseGrades);

    // Only return up to 3 (drop the oldest context month used for bonus computation)
    const startIdx = ascending.length > 3 ? 1 : 0;
    return ascending
      .slice(startIdx)
      .map((r, i): MonthSnapshot => ({
        monthKey:         r.month_key,
        incomeCents:      r.income_cents,
        mustBudgetCents:  r.must_budget_cents,
        mustSpentCents:   r.must_spent_cents,
        wantBudgetCents:  r.want_budget_cents,
        wantSpentCents:   r.want_spent_cents,
        keepBudgetCents:  r.keep_budget_cents,
        investSpentCents: r.invest_spent_cents,
        grade:            finalGrades[startIdx + i],
      }))
      .reverse(); // back to newest-first
  }, [db]);

  /** Up to 30 most-recent expenses from the given month, for pattern detection. */
  const getRecentExpenses = useCallback(async (monthId: number): Promise<ExpenseSample[]> => {
    const rows = await db.getAllAsync<RawExpense>(`
      SELECT title, amount_cents, final_bucket, spent_on
      FROM expenses
      WHERE month_id = ?
        AND is_investment = 0
      ORDER BY spent_on DESC
      LIMIT 30
    `, [monthId]);

    return rows.map((r): ExpenseSample => ({
      title:       r.title,
      amountCents: r.amount_cents,
      bucket:      r.final_bucket,
      spentOn:     r.spent_on.slice(0, 10),
    }));
  }, [db]);

  /** Active month id — needed to scope the expense query. */
  const getActiveMonthId = useCallback((): Promise<{ id: number } | null> => {
    return db.getFirstAsync<{ id: number }>(
      `SELECT id FROM months WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    );
  }, [db]);

  return { getPriorMonths, getRecentExpenses, getActiveMonthId };
}
