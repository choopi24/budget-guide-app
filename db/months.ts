import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getCurrentMonthKey } from '../lib/date';

export type DefaultSplit = {
  mustPct: number;
  wantPct: number;
  keepPct: number;
};

export function useMonthsDb() {
  const db = useSQLiteContext();

  const getDefaultSplit = useCallback(async function getDefaultSplit(): Promise<DefaultSplit> {
    const result = await db.getFirstAsync<{
      default_must_pct: number;
      default_want_pct: number;
      default_keep_pct: number;
    }>(`
      SELECT
        default_must_pct,
        default_want_pct,
        default_keep_pct
      FROM app_settings
      WHERE id = 1
    `);

    return {
      mustPct: result?.default_must_pct ?? 50,
      wantPct: result?.default_want_pct ?? 20,
      keepPct: result?.default_keep_pct ?? 30,
    };
  }, [db]);

  const getActiveMonth = useCallback(function getActiveMonth() {
    return db.getFirstAsync<{
      id: number;
      month_key: string;
    }>(`
      SELECT id, month_key
      FROM months
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `);
  }, [db]);

  const getPreviousMonthRollover = useCallback(async function getPreviousMonthRollover() {
    const prevMonth = await db.getFirstAsync<{
      must_budget_cents:  number;
      must_spent_cents:   number;
      want_budget_cents:  number;
      want_spent_cents:   number;
      keep_budget_cents:  number;
      invest_spent_cents: number;
    }>(`
      SELECT must_budget_cents, must_spent_cents, want_budget_cents, want_spent_cents,
             keep_budget_cents, invest_spent_cents
      FROM months
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `);

    const rolloverSettings = await db.getFirstAsync<{
      must_rollover_target:   string;
      want_rollover_target:   string;
      invest_rollover_target: string;
    }>(`SELECT must_rollover_target, want_rollover_target, invest_rollover_target FROM app_settings WHERE id = 1`);

    const mustTarget   = rolloverSettings?.must_rollover_target   ?? 'invest';
    const wantTarget   = rolloverSettings?.want_rollover_target   ?? 'want';
    const investTarget = rolloverSettings?.invest_rollover_target ?? 'invest';

    const mustRemainder   = Math.max(0, (prevMonth?.must_budget_cents  ?? 0) - (prevMonth?.must_spent_cents   ?? 0));
    const wantRemainder   = Math.max(0, (prevMonth?.want_budget_cents  ?? 0) - (prevMonth?.want_spent_cents   ?? 0));
    const investRemainder = Math.max(0, (prevMonth?.keep_budget_cents  ?? 0) - (prevMonth?.invest_spent_cents ?? 0));

    const mustBonus  = (mustTarget === 'must'   ? mustRemainder : 0) + (wantTarget === 'must'   ? wantRemainder : 0) + (investTarget === 'must'   ? investRemainder : 0);
    const wantBonus  = (mustTarget === 'want'   ? mustRemainder : 0) + (wantTarget === 'want'   ? wantRemainder : 0) + (investTarget === 'want'   ? investRemainder : 0);
    const keepBonus  = (mustTarget === 'invest' ? mustRemainder : 0) + (wantTarget === 'invest' ? wantRemainder : 0) + (investTarget === 'invest' ? investRemainder : 0);

    return { mustRemainder, wantRemainder, investRemainder, mustBonus, wantBonus, keepBonus };
  }, [db]);

  const createCurrentMonth = useCallback(async function createCurrentMonth(input: { incomeCents: number }) {
    const monthKey = getCurrentMonthKey();
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync<{
      id: number;
      month_key: string;
    }>(`
      SELECT id, month_key
      FROM months
      WHERE month_key = ?
      LIMIT 1
    `, [monthKey]);

    if (existing?.id) {
      return existing;
    }

    const split = await getDefaultSplit();

    const mustBudgetCents = Math.round(input.incomeCents * (split.mustPct / 100));
    const wantBudgetCents = Math.round(input.incomeCents * (split.wantPct / 100));
    const keepBudgetCents =
      input.incomeCents - mustBudgetCents - wantBudgetCents;

    // Read previous active month data and rollover settings before the transaction
    const prevMonth = await db.getFirstAsync<{
      must_budget_cents:  number;
      must_spent_cents:   number;
      want_budget_cents:  number;
      want_spent_cents:   number;
      keep_budget_cents:  number;
      invest_spent_cents: number;
    }>(`
      SELECT must_budget_cents, must_spent_cents, want_budget_cents, want_spent_cents,
             keep_budget_cents, invest_spent_cents
      FROM months
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `);

    const rolloverSettings = await db.getFirstAsync<{
      must_rollover_target:   string;
      want_rollover_target:   string;
      invest_rollover_target: string;
    }>(`SELECT must_rollover_target, want_rollover_target, invest_rollover_target FROM app_settings WHERE id = 1`);

    const mustTarget   = rolloverSettings?.must_rollover_target   ?? 'invest';
    const wantTarget   = rolloverSettings?.want_rollover_target   ?? 'want';
    const investTarget = rolloverSettings?.invest_rollover_target ?? 'invest';

    const mustRemainder   = Math.max(0, (prevMonth?.must_budget_cents  ?? 0) - (prevMonth?.must_spent_cents   ?? 0));
    const wantRemainder   = Math.max(0, (prevMonth?.want_budget_cents  ?? 0) - (prevMonth?.want_spent_cents   ?? 0));
    const investRemainder = Math.max(0, (prevMonth?.keep_budget_cents  ?? 0) - (prevMonth?.invest_spent_cents ?? 0));

    const mustBonus  = (mustTarget === 'must'   ? mustRemainder : 0) + (wantTarget === 'must'   ? wantRemainder : 0) + (investTarget === 'must'   ? investRemainder : 0);
    const wantBonus  = (mustTarget === 'want'   ? mustRemainder : 0) + (wantTarget === 'want'   ? wantRemainder : 0) + (investTarget === 'want'   ? investRemainder : 0);
    const keepBonus  = (mustTarget === 'invest' ? mustRemainder : 0) + (wantTarget === 'invest' ? wantRemainder : 0) + (investTarget === 'invest' ? investRemainder : 0);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE months
        SET
          status = 'closed',
          closed_at = ?,
          updated_at = ?
        WHERE status = 'active'
        `,
        [now, now]
      );

      await db.runAsync(
        `
        INSERT INTO months (
          month_key,
          status,
          income_cents,
          must_pct,
          want_pct,
          keep_pct,
          must_budget_cents,
          want_budget_cents,
          keep_budget_cents,
          must_rollover_cents,
          want_rollover_cents,
          keep_rollover_cents,
          must_spent_cents,
          want_spent_cents,
          plan_score,
          plan_status,
          opened_at,
          closed_at,
          created_at,
          updated_at
        )
        VALUES (?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, NULL, ?, NULL, ?, ?)
        `,
        [
          monthKey,
          input.incomeCents,
          split.mustPct,
          split.wantPct,
          split.keepPct,
          mustBudgetCents + mustBonus,
          wantBudgetCents + wantBonus,
          keepBudgetCents + keepBonus,
          mustBonus,
          wantBonus,
          keepBonus,
          now,
          now,
          now,
        ]
      );
    });

    return db.getFirstAsync<{
      id: number;
      month_key: string;
    }>(`
      SELECT id, month_key
      FROM months
      WHERE month_key = ?
      LIMIT 1
    `, [monthKey]);
  }, [db, getDefaultSplit]);

  return {
    getDefaultSplit,
    getActiveMonth,
    createCurrentMonth,
    getPreviousMonthRollover,
  };
}