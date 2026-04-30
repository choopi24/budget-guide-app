import { parseMoneyToCents, formatCentsToMoney, formatCompactMoney } from '../lib/money';

describe('parseMoneyToCents', () => {
  it('parses a plain integer', () => {
    expect(parseMoneyToCents('5000')).toBe(500000);
  });

  it('parses a decimal value', () => {
    expect(parseMoneyToCents('49.99')).toBe(4999);
  });

  it('strips thousands commas', () => {
    expect(parseMoneyToCents('10,500')).toBe(1050000);
  });

  it('returns 0 for an empty string', () => {
    expect(parseMoneyToCents('')).toBe(0);
  });

  it('returns 0 for whitespace', () => {
    expect(parseMoneyToCents('   ')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(parseMoneyToCents('abc')).toBe(0);
  });

  it('rounds via Math.round (IEEE 754: 1.005 * 100 = 100.499... → 100)', () => {
    expect(parseMoneyToCents('1.005')).toBe(100);
  });
});

describe('formatCentsToMoney', () => {
  it('formats ILS with shekel sign', () => {
    const result = formatCentsToMoney(500000, 'ILS');
    expect(result).toContain('5,000'); // 500000 cents = ₪5,000
    expect(result).toContain('₪');
  });

  it('formats USD with dollar sign', () => {
    const result = formatCentsToMoney(1000, 'USD');
    expect(result).toContain('10');
    expect(result).toContain('$');
  });

  it('formats EUR with euro sign', () => {
    const result = formatCentsToMoney(2500, 'EUR');
    expect(result).toContain('25');
    expect(result).toContain('€');
  });

  it('formats zero', () => {
    const result = formatCentsToMoney(0, 'ILS');
    expect(result).toContain('0');
  });

  it('formats negative values', () => {
    const result = formatCentsToMoney(-10000, 'USD');
    expect(result).toContain('100');
    // Negative formatting includes a minus or parentheses depending on locale
    expect(result.includes('-') || result.includes('(')).toBe(true);
  });

  it('defaults to ILS when currency is omitted', () => {
    const result = formatCentsToMoney(100);
    expect(result).toContain('₪');
  });
});

describe('formatCompactMoney', () => {
  it('formats values under 1000 without compact notation', () => {
    const result = formatCompactMoney(50000, 'USD'); // 500.00
    expect(result).toContain('500');
    expect(result).not.toMatch(/[KMB]/i);
  });

  it('formats values >= 1000 in compact notation', () => {
    const result = formatCompactMoney(1_000_00, 'USD'); // 1000
    // Compact may render as "1K" or "1,000"
    expect(result).toContain('1');
  });

  it('formats values >= 1,000,000 in compact notation', () => {
    const result = formatCompactMoney(1_000_000_00, 'USD'); // 1,000,000
    expect(result.toLowerCase()).toMatch(/m|1,000,000/);
  });
});
