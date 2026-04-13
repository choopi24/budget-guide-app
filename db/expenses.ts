import { useCallback } from 'react';
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

  return {
    addExpense,
  };
}