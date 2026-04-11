import { useSQLiteContext } from 'expo-sqlite';

export type HomeData = {
  month_key: string;
  income_cents: number;
  must_budget_cents: number;
  want_budget_cents: number;
  keep_budget_cents: number;
  must_spent_cents: number;
  want_spent_cents: number;
};

export function useHomeDb() {
  const db = useSQLiteContext();

  async function getActiveMonthHomeData() {
    return db.getFirstAsync<HomeData>(`
      SELECT
        month_key,
        income_cents,
        must_budget_cents,
        want_budget_cents,
        keep_budget_cents,
        must_spent_cents,
        want_spent_cents
      FROM months
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `);
  }

  return {
    getActiveMonthHomeData,
  };
}