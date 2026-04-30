import {
  computeRemainders,
  computeRolloverBonuses,
  computeBucketBudgets,
} from '../lib/budget';
import type { BucketAmounts, RolloverTargets } from '../lib/budget';

// Default targets used throughout: must→invest, want→want, invest→invest
const DEFAULT_TARGETS: RolloverTargets = {
  mustRolloverTarget:   'invest',
  wantRolloverTarget:   'want',
  investRolloverTarget: 'invest',
};

// ── computeRemainders ─────────────────────────────────────────────────────────

describe('computeRemainders', () => {
  it('returns the difference when spending is below budget', () => {
    const month: BucketAmounts = {
      mustBudgetCents: 5000_00, mustSpentCents: 3000_00,
      wantBudgetCents: 3000_00, wantSpentCents: 1000_00,
      keepBudgetCents: 2000_00, investSpentCents: 500_00,
    };
    expect(computeRemainders(month)).toEqual({
      mustRemainder:   2000_00,
      wantRemainder:   2000_00,
      investRemainder: 1500_00,
    });
  });

  it('floors overspending at 0 — no negative rollover', () => {
    const month: BucketAmounts = {
      mustBudgetCents: 3000_00, mustSpentCents: 5000_00, // overspent
      wantBudgetCents: 2000_00, wantSpentCents: 1000_00,
      keepBudgetCents: 1000_00, investSpentCents: 2000_00, // overspent
    };
    const rem = computeRemainders(month);
    expect(rem.mustRemainder).toBe(0);
    expect(rem.investRemainder).toBe(0);
    expect(rem.wantRemainder).toBe(1000_00);
  });

  it('returns 0 for all zeroes', () => {
    const month: BucketAmounts = {
      mustBudgetCents: 0, mustSpentCents: 0,
      wantBudgetCents: 0, wantSpentCents: 0,
      keepBudgetCents: 0, investSpentCents: 0,
    };
    expect(computeRemainders(month)).toEqual({
      mustRemainder: 0,
      wantRemainder: 0,
      investRemainder: 0,
    });
  });
});

// ── computeRolloverBonuses ────────────────────────────────────────────────────

describe('computeRolloverBonuses — no rollover (everything spent)', () => {
  it('returns zero bonuses when all remainders are 0', () => {
    const rem = { mustRemainder: 0, wantRemainder: 0, investRemainder: 0 };
    const bonuses = computeRolloverBonuses(rem, DEFAULT_TARGETS);
    expect(bonuses).toEqual({ mustBonus: 0, wantBonus: 0, keepBonus: 0 });
  });
});

describe('computeRolloverBonuses — want surplus rolls into next want', () => {
  it('routes want remainder to want bucket', () => {
    // Default: want→want
    const rem = { mustRemainder: 0, wantRemainder: 500_00, investRemainder: 0 };
    const bonuses = computeRolloverBonuses(rem, DEFAULT_TARGETS);
    expect(bonuses.wantBonus).toBe(500_00);
    expect(bonuses.mustBonus).toBe(0);
    expect(bonuses.keepBonus).toBe(0);
  });
});

describe('computeRolloverBonuses — must surplus rolls into invest (default)', () => {
  it('routes must remainder to keep/invest bucket', () => {
    // Default: must→invest
    const rem = { mustRemainder: 800_00, wantRemainder: 0, investRemainder: 0 };
    const bonuses = computeRolloverBonuses(rem, DEFAULT_TARGETS);
    expect(bonuses.keepBonus).toBe(800_00);
    expect(bonuses.mustBonus).toBe(0);
    expect(bonuses.wantBonus).toBe(0);
  });
});

describe('computeRolloverBonuses — invest surplus rolls into invest (default)', () => {
  it('routes invest remainder to keep/invest bucket', () => {
    const rem = { mustRemainder: 0, wantRemainder: 0, investRemainder: 200_00 };
    const bonuses = computeRolloverBonuses(rem, DEFAULT_TARGETS);
    expect(bonuses.keepBonus).toBe(200_00);
    expect(bonuses.mustBonus).toBe(0);
    expect(bonuses.wantBonus).toBe(0);
  });
});

describe('computeRolloverBonuses — all buckets route to must', () => {
  it('accumulates all surpluses into mustBonus', () => {
    const targets: RolloverTargets = {
      mustRolloverTarget:   'must',
      wantRolloverTarget:   'must',
      investRolloverTarget: 'must',
    };
    const rem = { mustRemainder: 100_00, wantRemainder: 200_00, investRemainder: 300_00 };
    const bonuses = computeRolloverBonuses(rem, targets);
    expect(bonuses.mustBonus).toBe(600_00);
    expect(bonuses.wantBonus).toBe(0);
    expect(bonuses.keepBonus).toBe(0);
  });
});

describe('computeRolloverBonuses — mixed targets', () => {
  it('correctly distributes when each bucket has a different destination', () => {
    const targets: RolloverTargets = {
      mustRolloverTarget:   'must',
      wantRolloverTarget:   'invest',
      investRolloverTarget: 'want',
    };
    const rem = { mustRemainder: 100_00, wantRemainder: 200_00, investRemainder: 50_00 };
    const bonuses = computeRolloverBonuses(rem, targets);
    expect(bonuses.mustBonus).toBe(100_00);    // only must→must
    expect(bonuses.keepBonus).toBe(200_00);    // only want→invest
    expect(bonuses.wantBonus).toBe(50_00);     // only invest→want
  });
});

// ── computeBucketBudgets ──────────────────────────────────────────────────────

describe('computeBucketBudgets', () => {
  it('splits 50/30 correctly leaving 20 for keep', () => {
    const result = computeBucketBudgets(10000_00, { mustPct: 50, wantPct: 30 });
    expect(result.mustBudgetCents).toBe(5000_00);
    expect(result.wantBudgetCents).toBe(3000_00);
    expect(result.keepBudgetCents).toBe(2000_00);
  });

  it('three buckets always sum to income (no rounding leak)', () => {
    const income = 12345_67; // odd number to exercise rounding
    const result = computeBucketBudgets(income, { mustPct: 50, wantPct: 20 });
    expect(result.mustBudgetCents + result.wantBudgetCents + result.keepBudgetCents).toBe(income);
  });

  it('handles 100% must (nothing left for others)', () => {
    const result = computeBucketBudgets(5000_00, { mustPct: 100, wantPct: 0 });
    expect(result.mustBudgetCents).toBe(5000_00);
    expect(result.wantBudgetCents).toBe(0);
    expect(result.keepBudgetCents).toBe(0);
  });
});

// ── end-to-end rollover scenario ──────────────────────────────────────────────

describe('full rollover scenario: editing an older month updates later months', () => {
  it('reduces keep bonus when want spending is added to a closed month', () => {
    // Month A before edit: want_budget=3000, want_spent=2000 → wantRemainder=1000
    // Default: want→want, so wantBonus for Month B = 1000
    const beforeEdit = computeRolloverBonuses(
      computeRemainders({
        mustBudgetCents: 5000_00, mustSpentCents: 5000_00,
        wantBudgetCents: 3000_00, wantSpentCents: 2000_00,
        keepBudgetCents: 1000_00, investSpentCents: 1000_00,
      }),
      DEFAULT_TARGETS,
    );
    expect(beforeEdit.wantBonus).toBe(1000_00);

    // After adding a 500 expense to want in Month A
    const afterEdit = computeRolloverBonuses(
      computeRemainders({
        mustBudgetCents: 5000_00, mustSpentCents: 5000_00,
        wantBudgetCents: 3000_00, wantSpentCents: 2500_00, // +500
        keepBudgetCents: 1000_00, investSpentCents: 1000_00,
      }),
      DEFAULT_TARGETS,
    );
    expect(afterEdit.wantBonus).toBe(500_00);
    // Month B's want budget should decrease by 500 after recalculation
    expect(beforeEdit.wantBonus - afterEdit.wantBonus).toBe(500_00);
  });

  it('caps rollover at 0 when overspending wipes out the surplus', () => {
    const rem = computeRemainders({
      mustBudgetCents: 5000_00, mustSpentCents: 7000_00, // severely over
      wantBudgetCents: 3000_00, wantSpentCents: 3500_00, // also over
      keepBudgetCents: 1000_00, investSpentCents: 1500_00,
    });
    expect(rem.mustRemainder).toBe(0);
    expect(rem.wantRemainder).toBe(0);
    expect(rem.investRemainder).toBe(0);

    const bonuses = computeRolloverBonuses(rem, DEFAULT_TARGETS);
    expect(bonuses.mustBonus).toBe(0);
    expect(bonuses.wantBonus).toBe(0);
    expect(bonuses.keepBonus).toBe(0);
  });
});
