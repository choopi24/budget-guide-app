import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export type InvestmentCategory =
  | 'ETF'
  | 'Stock'
  | 'Crypto'
  | 'Real Estate'
  | 'Savings'
  | 'Fund'
  | 'Other';

export type CreateInvestmentInput = {
  name: string;
  category: InvestmentCategory;
  assetSymbol?: string;
  assetCoinId?: string;
  assetQuantity?: number | null;
  isNew: boolean;
  openingDate: string;
  openingAmountCents: number;
  currentValueCents: number;
  note?: string;
};

export type CreateInvestmentWithExpenseInput = {
  pendingExpense: {
    title: string;
    amountCents: number;
    spentOn: string;
    note?: string;
  };
  investment: CreateInvestmentInput;
};

export type UpdateInvestmentInput = {
  id: number;
  name: string;
  category: InvestmentCategory;
  assetSymbol?: string;
  assetCoinId?: string;
  assetQuantity?: number | null;
  openingDate: string;
  openingAmountCents: number;
  currentValueCents: number;
  note?: string;
};

export function useInvestmentsDb() {
  const db = useSQLiteContext();

  const createInvestment = useCallback(async function createInvestment(input: CreateInvestmentInput) {
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `
        INSERT INTO savings_items (
          name,
          category,
          asset_symbol,
          asset_coin_id,
          asset_quantity,
          opening_date,
          opening_amount_cents,
          current_value_cents,
          note,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          input.name.trim(),
          input.category,
          input.assetSymbol?.trim().toUpperCase() || null,
          input.assetCoinId?.trim() || null,
          input.assetQuantity ?? null,
          input.openingDate,
          input.openingAmountCents,
          input.currentValueCents,
          input.note?.trim() || null,
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
          type,
          amount_cents,
          note,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          itemId,
          input.openingDate,
          input.currentValueCents,
          'initial',
          input.openingAmountCents,
          input.isNew ? 'Initial entry' : 'Imported existing investment',
          now,
        ]
      );
    });
  }, [db]);

  const updateInvestment = useCallback(async function updateInvestment(input: UpdateInvestmentInput) {
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE savings_items
        SET
          name = ?,
          category = ?,
          asset_symbol = ?,
          asset_coin_id = ?,
          asset_quantity = ?,
          opening_date = ?,
          opening_amount_cents = ?,
          current_value_cents = ?,
          note = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          input.name.trim(),
          input.category,
          input.assetSymbol?.trim().toUpperCase() || null,
          input.assetCoinId?.trim() || null,
          input.assetQuantity ?? null,
          input.openingDate,
          input.openingAmountCents,
          input.currentValueCents,
          input.note?.trim() || null,
          now,
          input.id,
        ]
      );

      // Keep the initial savings_updates row in sync so the chart
      // reflects the updated opening date and opening amount.
      await db.runAsync(
        `
        UPDATE savings_updates
        SET
          effective_date = ?,
          value_cents     = ?,
          amount_cents    = ?
        WHERE saving_item_id = ?
          AND type = 'initial'
        `,
        [
          input.openingDate,
          input.openingAmountCents,
          input.openingAmountCents,
          input.id,
        ]
      );
    });
  }, [db]);

  /**
   * Atomically saves a pending expense (from expense-new) and a new investment
   * in one transaction. Nothing is written until this function resolves —
   * cancelling before calling it leaves the DB untouched.
   */
  const createInvestmentWithExpense = useCallback(async function createInvestmentWithExpense(
    input: CreateInvestmentWithExpenseInput
  ) {
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Resolve active month
      const activeMonth = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM months WHERE status = 'active' ORDER BY id DESC LIMIT 1`
      );
      if (!activeMonth?.id) throw new Error('No active month found');

      // 2. Insert expense with is_investment = 1
      await db.runAsync(
        `INSERT INTO expenses
           (month_id, title, amount_cents, spent_on, note,
            suggested_bucket, final_bucket, is_investment, is_recurring,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'want', 'want', 1, 0, ?, ?)`,
        [
          activeMonth.id,
          input.pendingExpense.title.trim(),
          input.pendingExpense.amountCents,
          input.pendingExpense.spentOn,
          input.pendingExpense.note?.trim() || null,
          now,
          now,
        ]
      );

      // 3. Credit the invest bucket on the month
      await db.runAsync(
        `UPDATE months SET invest_spent_cents = invest_spent_cents + ?, updated_at = ? WHERE id = ?`,
        [input.pendingExpense.amountCents, now, activeMonth.id]
      );

      // 4. Insert savings_item
      const inv = input.investment;
      const itemResult = await db.runAsync(
        `INSERT INTO savings_items
           (name, category, asset_symbol, asset_coin_id, asset_quantity,
            opening_date, opening_amount_cents, current_value_cents, note,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.name.trim(),
          inv.category,
          inv.assetSymbol?.trim().toUpperCase() || null,
          inv.assetCoinId?.trim() || null,
          inv.assetQuantity ?? null,
          inv.openingDate,
          inv.openingAmountCents,
          inv.currentValueCents,
          inv.note?.trim() || null,
          now,
          now,
        ]
      );

      // 5. Insert initial savings_update
      await db.runAsync(
        `INSERT INTO savings_updates
           (saving_item_id, effective_date, value_cents, type, amount_cents, note, created_at)
         VALUES (?, ?, ?, 'initial', ?, ?, ?)`,
        [
          itemResult.lastInsertRowId,
          inv.openingDate,
          inv.currentValueCents,
          inv.openingAmountCents,
          inv.isNew ? 'Initial entry' : 'Imported existing investment',
          now,
        ]
      );
    });
  }, [db]);

  const getInvestmentById = useCallback((id: number) => {
    return db.getFirstAsync<{
      id: number;
      name: string;
      category: InvestmentCategory;
      asset_symbol: string | null;
      asset_coin_id: string | null;
      asset_quantity: number | null;
      opening_date: string;
      opening_amount_cents: number;
      current_value_cents: number;
      note: string | null;
    }>(
      `
      SELECT
        id,
        name,
        category,
        asset_symbol,
        asset_coin_id,
        asset_quantity,
        opening_date,
        opening_amount_cents,
        current_value_cents,
        note
      FROM savings_items
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );
  }, [db]);

  const getInvestmentsList = useCallback(() => {
    return db.getAllAsync<{
      id: number;
      name: string;
      category: string;
      asset_symbol: string | null;
      asset_coin_id: string | null;
      asset_quantity: number | null;
      opening_amount_cents: number;
      current_value_cents: number;
      total_cost_basis_cents: number;
      opening_date: string;
      note: string | null;
    }>(`
      SELECT
        si.id,
        si.name,
        si.category,
        si.asset_symbol,
        si.asset_coin_id,
        si.asset_quantity,
        si.opening_amount_cents,
        si.current_value_cents,
        si.opening_date,
        si.note,
        si.opening_amount_cents
          + COALESCE(SUM(CASE WHEN su.type = 'buy'  THEN su.amount_cents ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN su.type = 'sell' THEN su.amount_cents ELSE 0 END), 0)
        AS total_cost_basis_cents
      FROM savings_items si
      LEFT JOIN savings_updates su
        ON su.saving_item_id = si.id AND su.type IN ('buy', 'sell')
      GROUP BY si.id
      ORDER BY si.updated_at DESC, si.id DESC
    `);
  }, [db]);

  /**
   * Returns dated portfolio totals built from actual savings_updates rows.
   *
   * For each unique calendar date that any investment was touched, the query
   * sums each investment's most-recent recorded value on or before that date.
   * Investments that hadn't opened yet on a given date are excluded, so the
   * numbers are always accurate and never invented.
   *
   * Returns rows ordered oldest → newest.
   */
  const getPortfolioTimeline = useCallback(() => {
    return db.getAllAsync<{ effective_date: string; portfolio_value_cents: number }>(`
      SELECT
        d.effective_date,
        SUM(
          (SELECT su2.value_cents
           FROM savings_updates su2
           WHERE su2.saving_item_id = si.id
             AND date(su2.effective_date) <= d.effective_date
           ORDER BY su2.effective_date DESC, su2.id DESC
           LIMIT 1)
        ) AS portfolio_value_cents
      FROM (
        SELECT DISTINCT date(effective_date) AS effective_date
        FROM savings_updates
      ) d
      CROSS JOIN savings_items si
      WHERE EXISTS (
        SELECT 1
        FROM savings_updates su3
        WHERE su3.saving_item_id = si.id
          AND date(su3.effective_date) <= d.effective_date
      )
      GROUP BY d.effective_date
      ORDER BY d.effective_date
    `);
  }, [db]);

  return {
    createInvestment,
    createInvestmentWithExpense,
    updateInvestment,
    getInvestmentById,
    getInvestmentsList,
    getPortfolioTimeline,
  };
}