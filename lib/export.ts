import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

// ─── CSV primitives ───────────────────────────────────────────────────────────

function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(
  header: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [header.join(',')];
  for (const row of rows) lines.push(row.map(esc).join(','));
  return lines.join('\n');
}

function cents(n: number): string {
  return (n / 100).toFixed(2);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Share helper ─────────────────────────────────────────────────────────────

async function shareFile(filename: string, content: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device');

  const file = new File(Paths.cache, filename);
  file.write(content);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: filename,
    UTI: 'public.comma-separated-values-text',
  });
}

// ─── Months ───────────────────────────────────────────────────────────────────

type MonthDbRow = {
  month_key: string;
  status: string;
  income_cents: number;
  must_budget_cents: number;
  want_budget_cents: number;
  keep_budget_cents: number;
  must_spent_cents: number;
  want_spent_cents: number;
  invest_spent_cents: number;
  must_rollover_cents: number;
  want_rollover_cents: number;
  keep_rollover_cents: number;
  must_pct: number;
  want_pct: number;
  keep_pct: number;
  opened_at: string;
  closed_at: string | null;
};

export async function exportMonths(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<MonthDbRow>(`
    SELECT month_key, status, income_cents,
           must_budget_cents, want_budget_cents, keep_budget_cents,
           must_spent_cents, want_spent_cents, invest_spent_cents,
           must_rollover_cents, want_rollover_cents, keep_rollover_cents,
           must_pct, want_pct, keep_pct,
           opened_at, closed_at
    FROM months
    ORDER BY month_key ASC
  `);

  const header = [
    'month', 'status',
    'income',
    'must_budget', 'want_budget', 'invest_budget',
    'must_spent', 'want_spent', 'invest_spent',
    'must_rollover', 'want_rollover', 'invest_rollover',
    'must_pct', 'want_pct', 'invest_pct',
    'opened_at', 'closed_at',
  ];

  const data = rows.map((r) => [
    r.month_key, r.status,
    cents(r.income_cents),
    cents(r.must_budget_cents), cents(r.want_budget_cents), cents(r.keep_budget_cents),
    cents(r.must_spent_cents), cents(r.want_spent_cents), cents(r.invest_spent_cents),
    cents(r.must_rollover_cents), cents(r.want_rollover_cents), cents(r.keep_rollover_cents),
    r.must_pct, r.want_pct, r.keep_pct,
    r.opened_at, r.closed_at ?? '',
  ]);

  await shareFile(`budgetbull_months_${today()}.csv`, buildCsv(header, data));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

type ExpenseDbRow = {
  month_key: string;
  spent_on: string;
  title: string;
  amount_cents: number;
  final_bucket: string;
  category: string | null;
  is_investment: number;
  is_recurring: number;
  note: string | null;
};

export async function exportExpenses(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<ExpenseDbRow>(`
    SELECT m.month_key, e.spent_on, e.title, e.amount_cents,
           e.final_bucket, e.category, e.is_investment, e.is_recurring, e.note
    FROM expenses e
    JOIN months m ON e.month_id = m.id
    ORDER BY e.spent_on ASC, e.id ASC
  `);

  const header = [
    'month', 'date', 'title', 'amount',
    'bucket', 'category', 'is_investment', 'is_recurring', 'note',
  ];

  const data = rows.map((r) => [
    r.month_key, r.spent_on, r.title,
    cents(r.amount_cents),
    r.final_bucket,
    r.category ?? '',
    r.is_investment ? 'yes' : 'no',
    r.is_recurring  ? 'yes' : 'no',
    r.note ?? '',
  ]);

  await shareFile(`budgetbull_expenses_${today()}.csv`, buildCsv(header, data));
}

// ─── Investments ──────────────────────────────────────────────────────────────

type ItemDbRow = {
  name: string;
  category: string;
  asset_symbol: string | null;
  asset_quantity: number | null;
  opening_date: string;
  opening_amount_cents: number;
  current_value_cents: number;
  note: string | null;
};

export async function exportInvestments(db: SQLiteDatabase): Promise<void> {
  const items = await db.getAllAsync<ItemDbRow>(`
    SELECT name, category, asset_symbol, asset_quantity,
           opening_date, opening_amount_cents, current_value_cents, note
    FROM savings_items
    ORDER BY opening_date ASC, name ASC
  `);

  const header = [
    'name', 'category', 'symbol', 'quantity',
    'opened_date', 'opening_value', 'current_value', 'note',
  ];

  const data = items.map((r) => [
    r.name, r.category,
    r.asset_symbol ?? '', r.asset_quantity ?? '',
    r.opening_date,
    cents(r.opening_amount_cents), cents(r.current_value_cents),
    r.note ?? '',
  ]);

  await shareFile(`budgetbull_investments_${today()}.csv`, buildCsv(header, data));
}
