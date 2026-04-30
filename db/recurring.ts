import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getRecurringDateForMonth } from '../lib/recurring';

export type RecurringExpense = {
  id: number;
  title: string;
  amount_cents: number;
  bucket: 'must' | 'want';
  day_of_month: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type AddRecurringInput = {
  title: string;
  amountCents: number;
  bucket: 'must' | 'want';
  dayOfMonth: number;
};

export type UpdateRecurringInput = Partial<AddRecurringInput>;

export function useRecurringDb() {
  const db = useSQLiteContext();

  const getAll = useCallback(function getAll(): Promise<RecurringExpense[]> {
    return db.getAllAsync<RecurringExpense>(
      `SELECT * FROM recurring_expenses ORDER BY is_active DESC, day_of_month ASC, title ASC`,
    );
  }, [db]);

  const add = useCallback(async function add(input: AddRecurringInput): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO recurring_expenses (title, amount_cents, bucket, day_of_month, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [input.title.trim(), input.amountCents, input.bucket, input.dayOfMonth, now, now],
    );
  }, [db]);

  const update = useCallback(async function update(
    id: number,
    input: UpdateRecurringInput,
  ): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title.trim());
    }
    if (input.amountCents !== undefined) {
      fields.push('amount_cents = ?');
      values.push(input.amountCents);
    }
    if (input.bucket !== undefined) {
      fields.push('bucket = ?');
      values.push(input.bucket);
    }
    if (input.dayOfMonth !== undefined) {
      fields.push('day_of_month = ?');
      values.push(input.dayOfMonth);
    }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }, [db]);

  const setActive = useCallback(async function setActive(
    id: number,
    active: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE recurring_expenses SET is_active = ?, updated_at = ? WHERE id = ?`,
      [active ? 1 : 0, now, id],
    );
  }, [db]);

  const remove = useCallback(async function remove(id: number): Promise<void> {
    await db.runAsync(`DELETE FROM recurring_expenses WHERE id = ?`, [id]);
  }, [db]);

  /**
   * Returns active recurring expenses not yet applied in the given month.
   * Uses a NOT EXISTS subquery against recurring_logs for reliable duplicate prevention.
   */
  const getPendingForMonth = useCallback(function getPendingForMonth(
    monthKey: string,
  ): Promise<RecurringExpense[]> {
    return db.getAllAsync<RecurringExpense>(
      `SELECT r.*
       FROM recurring_expenses r
       WHERE r.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM recurring_logs l
           WHERE l.recurring_expense_id = r.id
             AND l.month_key = ?
         )
       ORDER BY r.day_of_month ASC, r.title ASC`,
      [monthKey],
    );
  }, [db]);

  /**
   * Adds a recurring expense to the current active month and records the log entry.
   * Throws if:
   *  - No active month exists
   *  - The recurring expense has already been applied this month (UNIQUE constraint)
   */
  const applyToActiveMonth = useCallback(async function applyToActiveMonth(
    recurring: RecurringExpense,
  ): Promise<{ monthKey: string }> {
    const activeMonth = await db.getFirstAsync<{ id: number; month_key: string }>(
      `SELECT id, month_key FROM months WHERE status = 'active' ORDER BY id DESC LIMIT 1`,
    );
    if (!activeMonth) throw new Error('No active month found');

    const now = new Date().toISOString();
    const spentOn = getRecurringDateForMonth(recurring.day_of_month, activeMonth.month_key);

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT INTO expenses
           (month_id, title, amount_cents, spent_on, note, suggested_bucket, final_bucket,
            is_investment, is_recurring, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, 0, 1, ?, ?)`,
        [
          activeMonth.id,
          recurring.title,
          recurring.amount_cents,
          spentOn,
          recurring.bucket,
          recurring.bucket,
          now,
          now,
        ],
      );

      // This INSERT will throw if the (recurring_expense_id, month_key) pair already exists,
      // enforcing the duplicate-prevention UNIQUE constraint.
      await db.runAsync(
        `INSERT INTO recurring_logs (recurring_expense_id, month_key, expense_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [recurring.id, activeMonth.month_key, result.lastInsertRowId, now],
      );

      if (recurring.bucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [recurring.amount_cents, now, activeMonth.id],
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [recurring.amount_cents, now, activeMonth.id],
        );
      }
    });

    return { monthKey: activeMonth.month_key };
  }, [db]);

  return { getAll, add, update, setActive, remove, getPendingForMonth, applyToActiveMonth };
}
