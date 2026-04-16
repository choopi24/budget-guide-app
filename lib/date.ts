function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns a human-friendly date label.
 * Accepts a Date object or an ISO string (full or YYYY-MM-DD).
 *
 * Examples:
 *   today          → "Today"
 *   yesterday      → "Yesterday"
 *   same year      → "Mon, Apr 5"
 *   different year → "Mon, Apr 5, 2023"
 */
export function formatFriendlyDate(value: Date | string): string {
  let date: Date;
  if (typeof value === 'string') {
    // Parse YYYY-MM-DD as local midnight to avoid UTC offset issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(value);
    }
  } else {
    date = value;
  }

  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (isSameLocalDay(date, now)) return 'Today';
  if (isSameLocalDay(date, yesterday)) return 'Yesterday';

  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  if (date.getFullYear() !== now.getFullYear()) {
    opts.year = 'numeric';
  }
  return date.toLocaleDateString('en-US', opts);
}

export function formatShortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateDisplay(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

export function getMonthLabelFromKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}