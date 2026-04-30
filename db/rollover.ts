import type { SQLiteDatabase } from 'expo-sqlite';
import {
  computeRemainders,
  computeRolloverBonuses,
  type RolloverTargets,
} from '../lib/budget';

type MonthRow = {
  id:                  number;
  month_key:           string;
  must_budget_cents:   number;
  must_rollover_cents: number;
  must_spent_cents:    number;
  want_budget_cents:   number;
  want_rollover_cents: number;
  want_spent_cents:    number;
  keep_budget_cents:   number;
  keep_rollover_cents: number;
  invest_spent_cents:  number;
};

/**
 * Re-derive the rollover bonuses and budget totals for every month that comes
 * AFTER `afterMonthKey`.  Call this whenever a past-month expense is
 * added, edited, or deleted — after the spent_cents of that month are already
 * written to the DB.
 *
 * Algorithm
 * ---------
 * 1. Read the pivot month (afterMonthKey) to get its final actuals.
 * 2. Read every subsequent month in ascending order.
 * 3. For each month:
 *    a. Compute remainders from the previous month's actuals (budget - spent).
 *    b. Route each surplus via the configured rollover targets.
 *    c. Add the new rollover bonuses on top of each month's BASE budget
 *       (base = stored budget minus its current rollover, which never changes).
 *    d. Write updated rollover + budget columns.
 *    e. Carry the updated state forward to the next iteration.
 * 4. All writes happen in a single transaction.
 *
 * If afterMonthKey is not in the DB (e.g. the very first month ever), the
 * chain starts with zero rollover for month[0].
 */
export async function recalculateMonthChain(
  db: SQLiteDatabase,
  afterMonthKey: string,
): Promise<void> {
  // Snapshot the pivot month's final actuals (spent_cents already updated by caller)
  const pivot = await db.getFirstAsync<{
    must_budget_cents:  number; must_spent_cents:    number;
    want_budget_cents:  number; want_spent_cents:    number;
    keep_budget_cents:  number; invest_spent_cents:  number;
  }>(
    `SELECT must_budget_cents, must_spent_cents,
            want_budget_cents, want_spent_cents,
            keep_budget_cents, invest_spent_cents
     FROM months WHERE month_key = ?`,
    [afterMonthKey],
  );

  // All months that come after the pivot
  const chain = await db.getAllAsync<MonthRow>(
    `SELECT id, month_key,
            must_budget_cents,   must_rollover_cents, must_spent_cents,
            want_budget_cents,   want_rollover_cents, want_spent_cents,
            keep_budget_cents,   keep_rollover_cents, invest_spent_cents
     FROM months
     WHERE month_key > ?
     ORDER BY month_key ASC`,
    [afterMonthKey],
  );

  if (chain.length === 0) return;

  const settings = await db.getFirstAsync<{
    must_rollover_target:   string;
    want_rollover_target:   string;
    invest_rollover_target: string;
  }>(
    `SELECT must_rollover_target, want_rollover_target, invest_rollover_target
     FROM app_settings WHERE id = 1`,
  );

  const targets: RolloverTargets = {
    mustRolloverTarget:   settings?.must_rollover_target   ?? 'invest',
    wantRolloverTarget:   settings?.want_rollover_target   ?? 'want',
    investRolloverTarget: settings?.invest_rollover_target ?? 'invest',
  };

  // In-memory state — updated each iteration so the next month sees the right
  // budget (spent_cents never change during this loop).
  const state = chain.map(m => ({ ...m }));
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < state.length; i++) {
      const month = state[i];

      // Previous actuals: either the pivot or the preceding chain month
      const prev = i === 0 ? pivot : {
        must_budget_cents:  state[i - 1].must_budget_cents,
        must_spent_cents:   state[i - 1].must_spent_cents,
        want_budget_cents:  state[i - 1].want_budget_cents,
        want_spent_cents:   state[i - 1].want_spent_cents,
        keep_budget_cents:  state[i - 1].keep_budget_cents,
        invest_spent_cents: state[i - 1].invest_spent_cents,
      };

      let mustBonus = 0, wantBonus = 0, keepBonus = 0;

      if (prev) {
        const rem = computeRemainders({
          mustBudgetCents:  prev.must_budget_cents,
          mustSpentCents:   prev.must_spent_cents,
          wantBudgetCents:  prev.want_budget_cents,
          wantSpentCents:   prev.want_spent_cents,
          keepBudgetCents:  prev.keep_budget_cents,
          investSpentCents: prev.invest_spent_cents,
        });
        const bonuses = computeRolloverBonuses(rem, targets);
        mustBonus = bonuses.mustBonus;
        wantBonus = bonuses.wantBonus;
        keepBonus = bonuses.keepBonus;
      }

      // Base budget = total budget minus the rollover that was already baked in
      const baseMust = month.must_budget_cents - month.must_rollover_cents;
      const baseWant = month.want_budget_cents - month.want_rollover_cents;
      const baseKeep = month.keep_budget_cents - month.keep_rollover_cents;

      const newMustBudget = baseMust + mustBonus;
      const newWantBudget = baseWant + wantBonus;
      const newKeepBudget = baseKeep + keepBonus;

      await db.runAsync(
        `UPDATE months SET
           must_rollover_cents = ?, want_rollover_cents = ?, keep_rollover_cents = ?,
           must_budget_cents   = ?, want_budget_cents   = ?, keep_budget_cents   = ?,
           updated_at = ?
         WHERE id = ?`,
        [mustBonus, wantBonus, keepBonus,
         newMustBudget, newWantBudget, newKeepBudget,
         now, month.id],
      );

      // Propagate updated budget forward (spent_cents stay from snapshot)
      state[i] = {
        ...month,
        must_rollover_cents: mustBonus,
        want_rollover_cents: wantBonus,
        keep_rollover_cents: keepBonus,
        must_budget_cents:   newMustBudget,
        want_budget_cents:   newWantBudget,
        keep_budget_cents:   newKeepBudget,
      };
    }
  });
}
