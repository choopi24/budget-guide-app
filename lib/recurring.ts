/**
 * Returns the ISO date string for a recurring expense's day within the given
 * month, clamping to the last valid day if needed (e.g. day 31 in February).
 *
 * @param dayOfMonth  1–31, as stored in recurring_expenses.day_of_month
 * @param monthKey    "YYYY-MM"
 */
export function getRecurringDateForMonth(dayOfMonth: number, monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const clamped = Math.min(Math.max(1, dayOfMonth), daysInMonth);
  return `${monthKey}-${String(clamped).padStart(2, '0')}`;
}

/**
 * Extracts the day-of-month (1–31) from an ISO date or datetime string.
 * Reads characters 8–9 of the string, which is always the DD portion of
 * a YYYY-MM-DD... value.
 */
export function extractDayOfMonth(isoDate: string): number {
  const day = parseInt(isoDate.slice(8, 10), 10);
  if (isNaN(day) || day < 1 || day > 31) return 1;
  return day;
}

/**
 * Returns the subset of active recurring expenses that have NOT yet been
 * applied in the current month.
 *
 * Pure — no DB access; pass the full active list and the set of IDs already
 * present in recurring_logs for this month.
 */
export function filterPending<T extends { id: number }>(
  actives: T[],
  appliedIds: Set<number>,
): T[] {
  return actives.filter((r) => !appliedIds.has(r.id));
}
