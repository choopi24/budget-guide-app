import { getRecurringDateForMonth, filterPending } from '../lib/recurring';

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
