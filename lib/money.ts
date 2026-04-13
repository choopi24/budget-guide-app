import type { SupportedCurrency } from '../db/settings';

export function parseMoneyToCents(input: string) {
  const normalized = input.replace(/,/g, '').trim();

  if (!normalized) return 0;

  const value = Number(normalized);

  if (Number.isNaN(value)) return 0;

  return Math.round(value * 100);
}

export function formatCompactMoney(
  cents: number,
  currency: SupportedCurrency = 'ILS'
) {
  const value = cents / 100;
  if (Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (Math.abs(value) >= 1_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCentsToMoney(
  cents: number,
  currency: SupportedCurrency = 'ILS'
) {
  const value = cents / 100;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}