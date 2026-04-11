import { useSQLiteContext } from 'expo-sqlite';

export type ExpenseHistoryItem = {
  id: number;
  title: string;
  amount_cents: number;
  spent_on: string;
  note: string | null;
  suggested_bucket: 'must' | 'want';
  final_bucket: 'must' | 'want';
};

export function useExpenseHistoryDb() {
  const db = useSQLiteContext();

  async function getActiveMonthExpenses() {
    return db.getAllAsync<ExpenseHistoryItem>(`
      SELECT
        e.id,
        e.title,
        e.amount_cents,
        e.spent_on,
        e.note,
        e.suggested_bucket,
        e.final_bucket
      FROM expenses e
      INNER JOIN months m ON m.id = e.month_id
      WHERE m.status = 'active'
      ORDER BY e.spent_on DESC, e.id DESC
    `);
  }

  async function getExpenseById(id: number) {
    return db.getFirstAsync<{
      id: number;
      month_id: number;
      title: string;
      amount_cents: number;
      spent_on: string;
      note: string | null;
      final_bucket: 'must' | 'want';
    }>(
      `
      SELECT
        id,
        month_id,
        title,
        amount_cents,
        spent_on,
        note,
        final_bucket
      FROM expenses
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  async function updateExpense(input: {
    id: number;
    title: string;
    amountCents: number;
    spentOn: string;
    note?: string;
    finalBucket: 'must' | 'want';
  }) {
    const now = new Date().toISOString();
    const existing = await getExpenseById(input.id);

    if (!existing) {
      throw new Error('Expense not found.');
    }

    await db.withTransactionAsync(async () => {
      if (existing.final_bucket === 'must') {
        await db.runAsync(
          `
          UPDATE months
          SET
            must_spent_cents = must_spent_cents - ?,
            updated_at = ?
          WHERE id = ?
          `,
          [existing.amount_cents, now, existing.month_id]
        );
      } else {
        await db.runAsync(
          `
          UPDATE months
          SET
            want_spent_cents = want_spent_cents - ?,
            updated_at = ?
          WHERE id = ?
          `,
          [existing.amount_cents, now, existing.month_id]
        );
      }

      await db.runAsync(
        `
        UPDATE expenses
        SET
          title = ?,
          amount_cents = ?,
          spent_on = ?,
          note = ?,
          final_bucket = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          input.title.trim(),
          input.amountCents,
          input.spentOn,
          input.note?.trim() || null,
          input.finalBucket,
          now,
          input.id,
        ]
      );

      if (input.finalBucket === 'must') {
        await db.runAsync(
          `
          UPDATE months
          SET
            must_spent_cents = must_spent_cents + ?,
            updated_at = ?
          WHERE id = ?
          `,
          [input.amountCents, now, existing.month_id]
        );
      } else {
        await db.runAsync(
          `
          UPDATE months
          SET
            want_spent_cents = want_spent_cents + ?,
            updated_at = ?
          WHERE id = ?
          `,
          [input.amountCents, now, existing.month_id]
        );
      }
    });
  }

  async function deleteExpense(id: number) {
    const now = new Date().toISOString();
    const existing = await getExpenseById(id);

    if (!existing) {
      throw new Error('Expense not found.');
    }

    await db.withTransactionAsync(async () => {
      if (existing.final_bucket === 'must') {
        await db.runAsync(
          `
          UPDATE months
          SET
            must_spent_cents = must_spent_cents - ?,
            updated_at = ?
          WHERE id = ?
          `,
          [existing.amount_cents, now, existing.month_id]
        );
      } else {
        await db.runAsync(
          `
          UPDATE months
          SET
            want_spent_cents = want_spent_cents - ?,
            updated_at = ?
          WHERE id = ?
          `,
          [existing.amount_cents, now, existing.month_id]
        );
      }

      await db.runAsync(
        `
        DELETE FROM expenses
        WHERE id = ?
        `,
        [id]
      );
    });
  }

  return {
    getActiveMonthExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
  };
}