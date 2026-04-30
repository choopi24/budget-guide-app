import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { recalculateMonthChain } from './rollover';

export type ExpenseHistoryItem = {
  id: number;
  title: string;
  amount_cents: number;
  spent_on: string;
  note: string | null;
  suggested_bucket: 'must' | 'want';
  final_bucket: 'must' | 'want';
  is_investment: number;
  category: string | null;
};

export type AllExpensesItem = {
  id: number;
  month_id: number;
  title: string;
  amount_cents: number;
  spent_on: string;
  note: string | null;
  final_bucket: 'must' | 'want';
  is_investment: number;
  month_key: string;
  category: string | null;
};

export type ClosedMonth = {
  id: number;
  month_key: string;
};

export function useExpenseHistoryDb() {
  const db = useSQLiteContext();

  const getAllExpenses = useCallback(() => {
    return db.getAllAsync<AllExpensesItem>(`
      SELECT
        e.id,
        e.month_id,
        e.title,
        e.amount_cents,
        e.spent_on,
        e.note,
        e.final_bucket,
        e.is_investment,
        e.category,
        m.month_key
      FROM expenses e
      INNER JOIN months m ON m.id = e.month_id
      ORDER BY m.month_key DESC, e.spent_on DESC, e.id DESC
    `);
  }, [db]);

  /** Returns all closed (not active) months, newest first. */
  const getClosedMonths = useCallback(() => {
    return db.getAllAsync<ClosedMonth>(`
      SELECT id, month_key
      FROM months
      WHERE status = 'closed'
      ORDER BY month_key DESC
    `);
  }, [db]);

  const getActiveMonthExpenses = useCallback(() => {
    return db.getAllAsync<ExpenseHistoryItem>(`
      SELECT
        e.id,
        e.title,
        e.amount_cents,
        e.spent_on,
        e.note,
        e.suggested_bucket,
        e.final_bucket,
        e.is_investment,
        e.category
      FROM expenses e
      INNER JOIN months m ON m.id = e.month_id
      WHERE m.status = 'active'
      ORDER BY e.spent_on DESC, e.id DESC
    `);
  }, [db]);

  const getExpenseById = useCallback((id: number) => {
    return db.getFirstAsync<{
      id: number;
      month_id: number;
      title: string;
      amount_cents: number;
      spent_on: string;
      note: string | null;
      final_bucket: 'must' | 'want';
      is_investment: number;
      category: string | null;
    }>(
      `SELECT id, month_id, title, amount_cents, spent_on, note, final_bucket, is_investment, category
       FROM expenses WHERE id = ? LIMIT 1`,
      [id]
    );
  }, [db]);

  const getMonthStatus = useCallback((monthId: number) => {
    return db.getFirstAsync<{ status: string; month_key: string }>(
      `SELECT status, month_key FROM months WHERE id = ? LIMIT 1`,
      [monthId]
    );
  }, [db]);

  const updateExpense = useCallback(async function updateExpense(input: {
    id: number;
    title: string;
    amountCents: number;
    spentOn: string;
    note?: string;
    finalBucket: 'must' | 'want';
    category?: string | null;
  }) {
    const now = new Date().toISOString();
    const existing = await getExpenseById(input.id);
    if (!existing) throw new Error('Expense not found.');

    const monthInfo = await getMonthStatus(existing.month_id);

    await db.withTransactionAsync(async () => {
      // Reverse old amount
      if (existing.is_investment) {
        await db.runAsync(
          `UPDATE months SET invest_spent_cents = invest_spent_cents - ?, updated_at = ? WHERE id = ?`,
          [existing.amount_cents, now, existing.month_id]
        );
      } else if (existing.final_bucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents - ?, updated_at = ? WHERE id = ?`,
          [existing.amount_cents, now, existing.month_id]
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents - ?, updated_at = ? WHERE id = ?`,
          [existing.amount_cents, now, existing.month_id]
        );
      }

      await db.runAsync(
        `UPDATE expenses SET title = ?, amount_cents = ?, spent_on = ?, note = ?, final_bucket = ?, category = ?, updated_at = ? WHERE id = ?`,
        [input.title.trim(), input.amountCents, input.spentOn, input.note?.trim() || null, input.finalBucket, input.category?.trim() || null, now, input.id]
      );

      // Investment expenses stay in invest_spent_cents after edit
      if (existing.is_investment) {
        await db.runAsync(
          `UPDATE months SET invest_spent_cents = invest_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, existing.month_id]
        );
      } else if (input.finalBucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, existing.month_id]
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, existing.month_id]
        );
      }
    });

    // If the expense was in a closed month, propagate changed spent_cents forward
    if (monthInfo && monthInfo.status === 'closed') {
      await recalculateMonthChain(db, monthInfo.month_key);
    }
  }, [db, getExpenseById, getMonthStatus]);

  const deleteExpense = useCallback(async function deleteExpense(id: number) {
    const now = new Date().toISOString();
    const existing = await getExpenseById(id);
    if (!existing) throw new Error('Expense not found.');

    const monthInfo = await getMonthStatus(existing.month_id);

    await db.withTransactionAsync(async () => {
      if (existing.is_investment) {
        await db.runAsync(
          `UPDATE months SET invest_spent_cents = invest_spent_cents - ?, updated_at = ? WHERE id = ?`,
          [existing.amount_cents, now, existing.month_id]
        );
      } else if (existing.final_bucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents - ?, updated_at = ? WHERE id = ?`,
          [existing.amount_cents, now, existing.month_id]
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents - ?, updated_at = ? WHERE id = ?`,
          [existing.amount_cents, now, existing.month_id]
        );
      }
      await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
    });

    // If the expense was in a closed month, propagate changed spent_cents forward
    if (monthInfo && monthInfo.status === 'closed') {
      await recalculateMonthChain(db, monthInfo.month_key);
    }
  }, [db, getExpenseById, getMonthStatus]);

  return {
    getAllExpenses,
    getClosedMonths,
    getActiveMonthExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getMonthStatus,
  };
}