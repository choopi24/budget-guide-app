import { useSQLiteContext } from 'expo-sqlite';
import { detectExpenseBucket, ExpenseBucket } from '../lib/expenseClassifier';

export type AddExpenseInput = {
  title: string;
  amountCents: number;
  spentOn: string;
  note?: string;
  finalBucket?: ExpenseBucket;
  createInvestmentRecord?: boolean;
  investmentCategory?: string;
};

export function useExpensesDb() {
  const db = useSQLiteContext();

  async function addExpense(input: AddExpenseInput) {
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
    const finalBucket = input.createInvestmentRecord
      ? 'want'
      : input.finalBucket ?? suggestedBucket;

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
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          activeMonth.id,
          input.title.trim(),
          input.amountCents,
          input.spentOn,
          input.note?.trim() || null,
          suggestedBucket,
          finalBucket,
          now,
          now,
        ]
      );

      if (finalBucket === 'must') {
        await db.runAsync(
          `
          UPDATE months
          SET
            must_spent_cents = must_spent_cents + ?,
            updated_at = ?
          WHERE id = ?
          `,
          [input.amountCents, now, activeMonth.id]
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
          [input.amountCents, now, activeMonth.id]
        );
      }

      if (input.createInvestmentRecord) {
        const result = await db.runAsync(
          `
          INSERT INTO savings_items (
            name,
            category,
            opening_date,
            opening_amount_cents,
            current_value_cents,
            note,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            input.title.trim(),
            input.investmentCategory?.trim() || 'Investment',
            input.spentOn,
            input.amountCents,
            input.amountCents,
            input.note?.trim() || 'Created from expense entry',
            now,
            now,
          ]
        );

        const itemId = result.lastInsertRowId;

        await db.runAsync(
          `
          INSERT INTO savings_updates (
            saving_item_id,
            effective_date,
            value_cents,
            note,
            created_at
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            itemId,
            input.spentOn,
            input.amountCents,
            'Initial investment entry',
            now,
          ]
        );
      }
    });

    return {
      suggestedBucket,
      finalBucket,
    };
  }

  return {
    addExpense,
  };
}