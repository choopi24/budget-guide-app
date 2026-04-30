import { getRecurringDateForMonth, filterPending, extractDayOfMonth } from '../lib/recurring';

// ── getRecurringDateForMonth ───────────────────────────────────────────────────

describe('getRecurringDateForMonth', () => {
  it('returns the correct date for a day that exists in the month', () => {
    expect(getRecurringDateForMonth(15, '2025-03')).toBe('2025-03-15');
  });

  it('pads single-digit days with a leading zero', () => {
    expect(getRecurringDateForMonth(1, '2025-01')).toBe('2025-01-01');
    expect(getRecurringDateForMonth(9, '2025-11')).toBe('2025-11-09');
  });

  it('clamps day 31 to 28 for a non-leap February', () => {
    expect(getRecurringDateForMonth(31, '2025-02')).toBe('2025-02-28');
  });

  it('clamps day 31 to 29 for a leap-year February', () => {
    expect(getRecurringDateForMonth(31, '2024-02')).toBe('2024-02-29');
  });

  it('clamps day 31 to 30 for April, June, September, November', () => {
    expect(getRecurringDateForMonth(31, '2025-04')).toBe('2025-04-30');
    expect(getRecurringDateForMonth(31, '2025-06')).toBe('2025-06-30');
    expect(getRecurringDateForMonth(31, '2025-09')).toBe('2025-09-30');
    expect(getRecurringDateForMonth(31, '2025-11')).toBe('2025-11-30');
  });

  it('does not clamp day 31 for months that have 31 days', () => {
    expect(getRecurringDateForMonth(31, '2025-01')).toBe('2025-01-31');
    expect(getRecurringDateForMonth(31, '2025-03')).toBe('2025-03-31');
    expect(getRecurringDateForMonth(31, '2025-05')).toBe('2025-05-31');
  });

  it('clamps days below 1 up to 1', () => {
    expect(getRecurringDateForMonth(0, '2025-03')).toBe('2025-03-01');
  });

  it('returns the last day of the month when day equals the last day exactly', () => {
    expect(getRecurringDateForMonth(28, '2025-02')).toBe('2025-02-28');
    expect(getRecurringDateForMonth(30, '2025-04')).toBe('2025-04-30');
  });
});

// ── filterPending ──────────────────────────────────────────────────────────────

describe('filterPending — duplicate prevention', () => {
  const actives = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it('returns all actives when none have been applied', () => {
    expect(filterPending(actives, new Set())).toEqual(actives);
  });

  it('removes a single already-applied entry', () => {
    expect(filterPending(actives, new Set([2]))).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('removes multiple already-applied entries', () => {
    expect(filterPending(actives, new Set([1, 3]))).toEqual([{ id: 2 }]);
  });

  it('returns empty array when all have been applied', () => {
    expect(filterPending(actives, new Set([1, 2, 3]))).toEqual([]);
  });

  it('handles empty actives list', () => {
    expect(filterPending([], new Set([1, 2]))).toEqual([]);
  });

  it('handles applied IDs that are not in the active list (no crash)', () => {
    expect(filterPending(actives, new Set([99, 100]))).toEqual(actives);
  });

  it('preserves the original order of actives', () => {
    const ordered = [{ id: 10 }, { id: 5 }, { id: 20 }];
    expect(filterPending(ordered, new Set([5]))).toEqual([{ id: 10 }, { id: 20 }]);
  });
});

// ── extractDayOfMonth ─────────────────────────────────────────────────────────

describe('extractDayOfMonth', () => {
  it('extracts a mid-month date', () => {
    expect(extractDayOfMonth('2025-04-15')).toBe(15);
  });

  it('extracts day 1', () => {
    expect(extractDayOfMonth('2025-01-01')).toBe(1);
  });

  it('extracts day 31', () => {
    expect(extractDayOfMonth('2025-03-31')).toBe(31);
  });

  it('works with full ISO datetime strings', () => {
    expect(extractDayOfMonth('2025-11-08T14:30:00.000Z')).toBe(8);
  });

  it('handles single-digit day with leading zero', () => {
    expect(extractDayOfMonth('2025-06-09')).toBe(9);
  });

  it('returns 1 for an empty string (guard)', () => {
    expect(extractDayOfMonth('')).toBe(1);
  });
});

// ── template duplicate prevention (pure) ─────────────────────────────────────

describe('template duplicate prevention via filterPending', () => {
  it('expense added via Add Expense (isRecurring=true) creates a log entry that prevents re-suggestion', () => {
    // After createFromExpense inserts a recurring_log for the new template,
    // getPendingForMonth excludes it. filterPending models this pure behaviour.
    const templates = [{ id: 10 }, { id: 20 }, { id: 30 }];
    const alreadyLoggedThisMonth = new Set([10]); // template 10 was just applied via Add Expense
    const pending = filterPending(templates, alreadyLoggedThisMonth);
    expect(pending.map((t) => t.id)).toEqual([20, 30]);
    expect(pending.find((t) => t.id === 10)).toBeUndefined();
  });

  it('if template title already exists, no new template is created (idempotent) — only the log entry differs', () => {
    // Simulates: existing template id=10, same title already active.
    // createFromExpense reuses template 10 and just logs the expense.
    // filterPending result for next month is the same either way.
    const templates = [{ id: 10 }];
    const noneLoggedYet = new Set<number>();
    expect(filterPending(templates, noneLoggedYet)).toEqual([{ id: 10 }]);

    // After logging:
    const loggedThisMonth = new Set([10]);
    expect(filterPending(templates, loggedThisMonth)).toEqual([]);
  });
});
