import { getMonthLabelFromKey, getCurrentMonthKey, formatDateDisplay } from '../lib/date';

describe('getMonthLabelFromKey', () => {
  it('returns a readable month+year string', () => {
    expect(getMonthLabelFromKey('2025-01')).toBe('January 2025');
    expect(getMonthLabelFromKey('2024-12')).toBe('December 2024');
  });

  it('handles February correctly', () => {
    expect(getMonthLabelFromKey('2024-02')).toBe('February 2024');
  });
});

describe('getCurrentMonthKey', () => {
  it('returns a string matching YYYY-MM format', () => {
    const key = getCurrentMonthKey();
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });

  it('reflects the current year and month', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(getCurrentMonthKey()).toBe(expected);
  });
});

describe('formatDateDisplay', () => {
  it('formats a YYYY-MM-DD string as DD/MM/YYYY', () => {
    expect(formatDateDisplay('2025-04-15')).toBe('15/04/2025');
  });

  it('pads day and month with leading zeros', () => {
    expect(formatDateDisplay('2025-01-05')).toBe('05/01/2025');
  });

  it('returns empty string for null', () => {
    expect(formatDateDisplay(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateDisplay(undefined)).toBe('');
  });
});
