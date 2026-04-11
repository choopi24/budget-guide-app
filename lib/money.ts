import type { SupportedCurrency } from '../db/settings';

export function parseMoneyToCents(input: string) {
  const normalized = input.replace(/,/g, '').trim();

  if (!normalized) return 0;

  const value = Number(normalized);

  if (Number.isNaN(value)) return 0;

  return Math.round(value * 100);
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