import { useSQLiteContext } from 'expo-sqlite';
import { getCurrentMonthKey } from '../lib/date';

export type DefaultSplit = {
  mustPct: number;
  wantPct: number;
  keepPct: number;
};

export function useMonthsDb() {
  const db = useSQLiteContext();

  async function getDefaultSplit(): Promise<DefaultSplit> {
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
  }

  async function getActiveMonth() {
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
  }

  async function createCurrentMonth(input: { incomeCents: number }) {
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
        VALUES (?, 'active', ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NULL, NULL, ?, NULL, ?, ?)
        `,
        [
          monthKey,
          input.incomeCents,
          split.mustPct,
          split.wantPct,
          split.keepPct,
          mustBudgetCents,
          wantBudgetCents,
          keepBudgetCents,
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
  }

  return {
    getDefaultSplit,
    getActiveMonth,
    createCurrentMonth,
  };
}