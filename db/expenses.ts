import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { detectExpenseBucket, ExpenseBucket } from '../lib/expenseClassifier';
import { recalculateMonthChain } from './rollover';

export type AddExpenseInput = {
  title: string;
  amountCents: number;
  spentOn: string;
  note?: string;
  finalBucket?: ExpenseBucket;
  createInvestmentRecord?: boolean;
  investmentCategory?: string;
  isRecurring?: boolean;
};

export function useExpensesDb() {
  const db = useSQLiteContext();

  const addExpense = useCallback(async function addExpense(input: AddExpenseInput) {
    const now = new Date().toISOString();

    const activeMonth = await db.getFirstAsync<{ id: number }>(`
      SELECT id
      FROM months
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `);

    if (!activeMonth?.id) {
      throw new Error('No active month found');
    }

    const suggestedBucket = detectExpenseBucket(input.title);
    const isInvestment = input.createInvestmentRecord ? 1 : 0;
    const isRecurring = input.isRecurring ? 1 : 0;
    const finalBucket = input.finalBucket ?? suggestedBucket;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        INSERT INTO expenses (
          month_id,
          title,
          amount_cents,
          spent_on,
          note,
          suggested_bucket,
          final_bucket,
          is_investment,
          is_recurring,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          activeMonth.id,
          input.title.trim(),
          input.amountCents,
          input.spentOn,
          input.note?.trim() || null,
          suggestedBucket,
          finalBucket,
          isInvestment,
          isRecurring,
          now,
          now,
        ]
      );

      if (isInvestment) {
        await db.runAsync(
          `UPDATE months SET invest_spent_cents = invest_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, activeMonth.id]
        );
      } else if (finalBucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, activeMonth.id]
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, activeMonth.id]
        );
      }
    });

    return {
      suggestedBucket,
      finalBucket,
    };
  }, [db]);

  /**
   * Adds an expense to a specific closed month and recalculates the full
   * chain of subsequent months' rollover budgets.
   *
   * Returns `{ rolloverAdjusted: boolean }` so the caller can tell the user
   * when downstream carryover was updated.
   */
  const addPastMonthExpense = useCallback(async function addPastMonthExpense(input: {
    monthId: number;
    title: string;
    amountCents: number;
    note?: string;
    finalBucket: 'must' | 'want';
    spentOn: string;
  }): Promise<{ rolloverAdjusted: boolean }> {
    const now = new Date().toISOString();
    const suggestedBucket = detectExpenseBucket(input.title);

    const targetMonth = await db.getFirstAsync<{ month_key: string }>(
      `SELECT month_key FROM months WHERE id = ?`,
      [input.monthId],
    );
    if (!targetMonth) throw new Error('Month not found');

    // Insert the expense and update the target month's spent_cents
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO expenses (month_id, title, amount_cents, spent_on, note, suggested_bucket, final_bucket, is_investment, is_recurring, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [input.monthId, input.title.trim(), input.amountCents, input.spentOn,
         input.note?.trim() || null, suggestedBucket, input.finalBucket, now, now],
      );

      if (input.finalBucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, input.monthId],
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, input.monthId],
        );
      }
    });

    // Recalculate full rollover chain for all months after this one
    await recalculateMonthChain(db, targetMonth.month_key);

    const hasFollowing = !!(await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM months WHERE month_key > ? LIMIT 1`,
      [targetMonth.month_key],
    ));

    return { rolloverAdjusted: hasFollowing };
  }, [db]);

  const findPotentialDuplicate = useCallback(async function findPotentialDuplicate(input: {
    amountCents: number;
    dateIso: string;
    title: string;
  }): Promise<{ id: number; title: string; spentOn: string } | null> {
    // Search for expenses with the same amount within ±1 day
    const d = new Date(input.dateIso + 'T00:00:00');
    const dayBefore = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
    const dayAfter  = new Date(d.getTime() + 86400000).toISOString().slice(0, 10);

    const rows = await db.getAllAsync<{ id: number; title: string; spent_on: string }>(
      `SELECT id, title, spent_on FROM expenses
       WHERE amount_cents = ?
         AND date(spent_on) BETWEEN ? AND ?
       ORDER BY spent_on DESC
       LIMIT 5`,
      [input.amountCents, dayBefore, dayAfter]
    );

    if (!rows.length) return null;

    const titleLow = input.title.toLowerCase().trim();
    for (const row of rows) {
      const rowLow = row.title.toLowerCase().trim();
      // Exact match or one title contains the other
      if (rowLow === titleLow || rowLow.includes(titleLow) || titleLow.includes(rowLow)) {
        return { id: row.id, title: row.title, spentOn: row.spent_on };
      }
    }
    // Same amount on same date with any title is still suspicious — return first
    if (rows.length > 0) {
      return { id: rows[0].id, title: rows[0].title, spentOn: rows[0].spent_on };
    }
    return null;
  }, [db]);

  return {
    addExpense,
    addPastMonthExpense,
    findPotentialDuplicate,
  };
}
