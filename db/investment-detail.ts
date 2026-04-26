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

export type InvestmentUpdateType = 'initial' | 'buy' | 'sell' | 'value_update';

export type InvestmentUpdateRow = {
  id: number;
  effective_date: string;
  value_cents: number;
  type: InvestmentUpdateType;
  amount_cents: number | null;
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
        type,
        amount_cents,
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
    type?: InvestmentUpdateType;
    amountCents?: number | null;
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
          type,
          amount_cents,
          note,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          input.investmentId,
          input.effectiveDate,
          input.valueCents,
          input.type ?? 'value_update',
          input.amountCents ?? null,
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

      // Remove any existing live-price entry for today before inserting a fresh one.
      await db.runAsync(
        `DELETE FROM savings_updates
         WHERE saving_item_id = ? AND effective_date = ? AND type = 'value_update'`,
        [input.investmentId, today]
      );
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
        [input.investmentId, today, currentValueCents, 'value_update', null, 'Live price refresh', now]
      );
    });

    return {
      unitPrice,
      currentValueCents,
    };
  }, [db]);

  /** Fetch a single savings_updates row by its id. */
  const getInvestmentUpdate = useCallback((updateId: number) => {
    return db.getFirstAsync<InvestmentUpdateRow>(
      `SELECT id, effective_date, value_cents, type, amount_cents, note
       FROM savings_updates WHERE id = ? LIMIT 1`,
      [updateId]
    );
  }, [db]);

  /**
   * Edit an existing savings_updates row, then recalculate the parent
   * investment's current_value_cents from the most recent remaining row.
   * For 'initial' rows, also keeps savings_items.opening_date and
   * opening_amount_cents in sync.
   */
  const editInvestmentUpdate = useCallback(async function editInvestmentUpdate(input: {
    updateId: number;
    investmentId: number;
    type: InvestmentUpdateType;
    effectiveDate: string;
    valueCents: number;
    amountCents: number | null;
    note: string;
  }) {
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE savings_updates
         SET effective_date = ?, value_cents = ?, amount_cents = ?, note = ?
         WHERE id = ?`,
        [
          input.effectiveDate,
          input.valueCents,
          input.amountCents ?? null,
          input.note.trim() || null,
          input.updateId,
        ]
      );

      // Recalculate current value from the latest remaining row.
      await db.runAsync(
        `UPDATE savings_items
         SET current_value_cents = (
           SELECT value_cents FROM savings_updates
           WHERE saving_item_id = ?
           ORDER BY effective_date DESC, id DESC
           LIMIT 1
         ), updated_at = ?
         WHERE id = ?`,
        [input.investmentId, now, input.investmentId]
      );

      // Keep opening metadata in sync when the initial row is edited.
      if (input.type === 'initial') {
        await db.runAsync(
          `UPDATE savings_items
           SET opening_date = ?, opening_amount_cents = ?, updated_at = ?
           WHERE id = ?`,
          [input.effectiveDate, input.valueCents, now, input.investmentId]
        );
      }
    });
  }, [db]);

  /**
   * Delete a savings_updates row, then recalculate current_value_cents.
   * Falls back to opening_amount_cents if no updates remain.
   */
  const deleteInvestmentUpdate = useCallback(async function deleteInvestmentUpdate(input: {
    updateId: number;
    investmentId: number;
  }) {
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM savings_updates WHERE id = ?`,
        [input.updateId]
      );
      await db.runAsync(
        `UPDATE savings_items
         SET current_value_cents = COALESCE(
           (SELECT value_cents FROM savings_updates
            WHERE saving_item_id = ?
            ORDER BY effective_date DESC, id DESC
            LIMIT 1),
           opening_amount_cents
         ), updated_at = ?
         WHERE id = ?`,
        [input.investmentId, now, input.investmentId]
      );
    });
  }, [db]);

  /**
   * Atomically records an investment purchase AND credits the active month's
   * Invest budget bucket. Use this only when the user confirms the contribution
   * was funded from the current month's budget.
   *
   * If no active month exists the whole transaction is aborted — nothing is written.
   */
  const addInvestmentPurchaseWithMonthContribution = useCallback(
    async function addInvestmentPurchaseWithMonthContribution(input: {
      investmentId: number;
      effectiveDate: string;
      purchaseCents: number;
      note?: string;
    }) {
      const now = new Date().toISOString();

      const existing = await getInvestmentDetail(input.investmentId);
      if (!existing) throw new Error('Investment not found.');

      const newTotalCents = existing.current_value_cents + input.purchaseCents;

      await db.withTransactionAsync(async () => {
        // 1. Record the buy event
        await db.runAsync(
          `INSERT INTO savings_updates
             (saving_item_id, effective_date, value_cents, type, amount_cents, note, created_at)
           VALUES (?, ?, ?, 'buy', ?, ?, ?)`,
          [
            input.investmentId,
            input.effectiveDate,
            newTotalCents,
            input.purchaseCents,
            input.note?.trim() || null,
            now,
          ]
        );

        // 2. Update investment's current value
        await db.runAsync(
          `UPDATE savings_items SET current_value_cents = ?, updated_at = ? WHERE id = ?`,
          [newTotalCents, now, input.investmentId]
        );

        // 3. Find active month — abort the whole transaction if none exists
        const activeMonth = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM months WHERE status = 'active' ORDER BY id DESC LIMIT 1`
        );
        if (!activeMonth?.id) throw new Error('No active month found. Set up a month before recording budget contributions.');

        // 4. Insert investment expense record
        await db.runAsync(
          `INSERT INTO expenses
             (month_id, title, amount_cents, spent_on, note,
              suggested_bucket, final_bucket, is_investment, is_recurring,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'want', 'want', 1, 0, ?, ?)`,
          [
            activeMonth.id,
            existing.name.trim(),
            input.purchaseCents,
            input.effectiveDate,
            input.note?.trim() || null,
            now,
            now,
          ]
        );

        // 5. Credit the month's invest bucket
        await db.runAsync(
          `UPDATE months SET invest_spent_cents = invest_spent_cents + ?, updated_at = ? WHERE id = ?`,
          [input.purchaseCents, now, activeMonth.id]
        );
      });
    },
    [db, getInvestmentDetail]
  );

  return {
    getInvestmentDetail,
    getInvestmentUpdates,
    getInvestmentUpdate,
    addInvestmentUpdate,
    addInvestmentPurchaseWithMonthContribution,
    editInvestmentUpdate,
    deleteInvestmentUpdate,
    deleteInvestment,
    refreshCryptoCurrentValue,
  };
}