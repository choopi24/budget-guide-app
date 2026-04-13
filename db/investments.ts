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
          note,
          created_at
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          itemId,
          input.openingDate,
          input.currentValueCents,
          input.isNew ? 'Initial entry' : 'Imported existing investment',
          now,
        ]
      );
    });
  }, [db]);

  const updateInvestment = useCallback(async function updateInvestment(input: UpdateInvestmentInput) {
    const now = new Date().toISOString();

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
      opening_date: string;
      note: string | null;
    }>(`
      SELECT
        id,
        name,
        category,
        asset_symbol,
        asset_coin_id,
        asset_quantity,
        opening_amount_cents,
        current_value_cents,
        opening_date,
        note
      FROM savings_items
      ORDER BY updated_at DESC, id DESC
    `);
  }, [db]);

  return {
    createInvestment,
    updateInvestment,
    getInvestmentById,
    getInvestmentsList,
  };
}