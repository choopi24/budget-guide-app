import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { SupportedCurrency } from './settings';

export type InvestmentDetail = {
  id: number;
  name: string;
  category: string;
  asset_symbol: string | null;
  asset_coin_id: string | null;
  asset_quantity: number | null;
  opening_date: string;
  opening_amount_cents: number;
  current_value_cents: number;
  note: string | null;
};

export type InvestmentUpdateRow = {
  id: number;
  effective_date: string;
  value_cents: number;
  note: string | null;
};

function mapCurrencyToVs(currency: SupportedCurrency) {
  if (currency === 'USD') return 'usd';
  if (currency === 'EUR') return 'eur';
  return 'ils';
}

export function useInvestmentDetailDb() {
  const db = useSQLiteContext();

  const getInvestmentDetail = useCallback((id: number) => {
    return db.getFirstAsync<InvestmentDetail>(
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

  const getInvestmentUpdates = useCallback((id: number) => {
    return db.getAllAsync<InvestmentUpdateRow>(
      `
      SELECT
        id,
        effective_date,
        value_cents,
        note
      FROM savings_updates
      WHERE saving_item_id = ?
      ORDER BY effective_date DESC, id DESC
      `,
      [id]
    );
  }, [db]);

  const addInvestmentUpdate = useCallback(async function addInvestmentUpdate(input: {
    investmentId: number;
    effectiveDate: string;
    valueCents: number;
    note?: string;
    quantityDelta?: number | null;
  }) {
    const now = new Date().toISOString();

    const existing = await getInvestmentDetail(input.investmentId);
    if (!existing) {
      throw new Error('Investment not found.');
    }

    const nextQuantity =
      typeof input.quantityDelta === 'number'
        ? Math.max((existing.asset_quantity ?? 0) + input.quantityDelta, 0)
        : existing.asset_quantity;

    await db.withTransactionAsync(async () => {
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
          input.investmentId,
          input.effectiveDate,
          input.valueCents,
          input.note?.trim() || null,
          now,
        ]
      );

      await db.runAsync(
        `
        UPDATE savings_items
        SET
          current_value_cents = ?,
          asset_quantity = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [input.valueCents, nextQuantity ?? null, now, input.investmentId]
      );
    });
  }, [db, getInvestmentDetail]);

  const deleteInvestment = useCallback(async function deleteInvestment(investmentId: number) {
    await db.runAsync(
      `
      DELETE FROM savings_items
      WHERE id = ?
      `,
      [investmentId]
    );
  }, [db]);

  const refreshCryptoCurrentValue = useCallback(async function refreshCryptoCurrentValue(input: {
    investmentId: number;
    coinId: string;
    quantity: number;
    currency: SupportedCurrency;
  }) {
    const vs = mapCurrencyToVs(input.currency);
    const coinId = input.coinId.trim();

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        coinId
      )}&vs_currencies=${vs}&include_last_updated_at=true`
    );

    if (!response.ok) {
      throw new Error('Could not fetch live crypto price.');
    }

    const data = await response.json();
    const entry = data?.[coinId] as Record<string, number> | undefined;
    const unitPrice = entry?.[vs];

    if (typeof unitPrice !== 'number') {
      throw new Error('No live price found for this selected coin.');
    }

    const currentValueCents = Math.round(unitPrice * input.quantity * 100);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE savings_items
        SET
          current_value_cents = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [currentValueCents, now, input.investmentId]
      );

      await db.runAsync(
        `
        INSERT OR REPLACE INTO savings_updates (
          saving_item_id,
          effective_date,
          value_cents,
          note,
          created_at
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [input.investmentId, today, currentValueCents, 'Live price refresh', now]
      );
    });

    return {
      unitPrice,
      currentValueCents,
    };
  }, [db]);

  return {
    getInvestmentDetail,
    getInvestmentUpdates,
    addInvestmentUpdate,
    deleteInvestment,
    refreshCryptoCurrentValue,
  };
}