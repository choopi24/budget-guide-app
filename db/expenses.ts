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

  /**
   * Adds an expense to a specific closed month and recalculates the
   * immediately following month's rollover (single-hop).
   *
   * Returns `{ rolloverAdjusted: boolean }` so the caller can tell the user
   * when a downstream month's carryover was updated.
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

    // ── Snapshot the target month before the edit ──────────────────────────
    const targetMonth = await db.getFirstAsync<{
      month_key:          string;
      must_budget_cents:  number;
      must_spent_cents:   number;
      want_budget_cents:  number;
      want_spent_cents:   number;
      keep_budget_cents:  number;
      invest_spent_cents: number;
    }>(`
      SELECT month_key, must_budget_cents, must_spent_cents,
             want_budget_cents, want_spent_cents,
             keep_budget_cents, invest_spent_cents
      FROM months WHERE id = ?
    `, [input.monthId]);

    if (!targetMonth) throw new Error('Month not found');

    // ── Rollover settings ──────────────────────────────────────────────────
    const settings = await db.getFirstAsync<{
      must_rollover_target:   string;
      want_rollover_target:   string;
      invest_rollover_target: string;
    }>(`SELECT must_rollover_target, want_rollover_target, invest_rollover_target FROM app_settings WHERE id = 1`);

    const mustTarget   = settings?.must_rollover_target   ?? 'invest';
    const wantTarget   = settings?.want_rollover_target   ?? 'want';
    const investTarget = settings?.invest_rollover_target ?? 'invest';

    // ── Compute surplus BEFORE and AFTER this expense ──────────────────────
    const oldMustLeft   = Math.max(0, targetMonth.must_budget_cents  - targetMonth.must_spent_cents);
    const oldWantLeft   = Math.max(0, targetMonth.want_budget_cents  - targetMonth.want_spent_cents);
    const investLeft    = Math.max(0, targetMonth.keep_budget_cents  - targetMonth.invest_spent_cents);

    const newMustLeft   = Math.max(0, targetMonth.must_budget_cents  - (targetMonth.must_spent_cents  + (input.finalBucket === 'must' ? input.amountCents : 0)));
    const newWantLeft   = Math.max(0, targetMonth.want_budget_cents  - (targetMonth.want_spent_cents  + (input.finalBucket === 'want' ? input.amountCents : 0)));

    function calcBonuses(mustR: number, wantR: number, investR: number) {
      return {
        must:   (mustTarget === 'must'   ? mustR : 0) + (wantTarget === 'must'   ? wantR : 0) + (investTarget === 'must'   ? investR : 0),
        want:   (mustTarget === 'want'   ? mustR : 0) + (wantTarget === 'want'   ? wantR : 0) + (investTarget === 'want'   ? investR : 0),
        keep:   (mustTarget === 'invest' ? mustR : 0) + (wantTarget === 'invest' ? wantR : 0) + (investTarget === 'invest' ? investR : 0),
      };
    }

    const oldBonuses = calcBonuses(oldMustLeft, oldWantLeft, investLeft);
    const newBonuses = calcBonuses(newMustLeft, newWantLeft, investLeft);

    const mustDelta = newBonuses.must - oldBonuses.must;
    const wantDelta = newBonuses.want - oldBonuses.want;
    const keepDelta = newBonuses.keep - oldBonuses.keep;

    // ── Find the immediately following month (if any) ──────────────────────
    const nextMonth = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM months WHERE month_key > ? ORDER BY month_key ASC LIMIT 1`,
      [targetMonth.month_key]
    );

    const rolloverAdjusted =
      !!nextMonth && (mustDelta !== 0 || wantDelta !== 0 || keepDelta !== 0);

    // ── Write everything in one transaction ───────────────────────────────
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO expenses (month_id, title, amount_cents, spent_on, note, suggested_bucket, final_bucket, is_investment, is_recurring, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [input.monthId, input.title.trim(), input.amountCents, input.spentOn,
         input.note?.trim() || null, suggestedBucket, input.finalBucket, now, now]
      );

      if (input.finalBucket === 'must') {
        await db.runAsync(
          `UPDATE months SET must_spent_cents = must_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, input.monthId]
        );
      } else {
        await db.runAsync(
          `UPDATE months SET want_spent_cents = want_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.amountCents, now, input.monthId]
        );
      }

      // Adjust next month's stored rollover columns and budget totals
      if (rolloverAdjusted) {
        await db.runAsync(
          `UPDATE months SET
             must_rollover_cents = must_rollover_cents + ?,
             want_rollover_cents = want_rollover_cents + ?,
             keep_rollover_cents = keep_rollover_cents + ?,
             must_budget_cents   = must_budget_cents   + ?,
             want_budget_cents   = want_budget_cents   + ?,
             keep_budget_cents   = keep_budget_cents   + ?,
             updated_at = ?
           WHERE id = ?`,
          [mustDelta, wantDelta, keepDelta, mustDelta, wantDelta, keepDelta, now, nextMonth!.id]
        );
      }
    });

    return { rolloverAdjusted };
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