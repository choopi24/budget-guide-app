export type ShortcutSource = 'applepay' | 'shortcut';

export type ParsedShortcutTransaction = {
  amount?: number;
  merchant?: string;
  date: string;        // always present — today if missing/invalid
  card?: string;
  categoryHint?: string;
  source: ShortcutSource;
  rawParams: Record<string, string | string[] | undefined>;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function coerceString(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s : undefined;
}

function parseAmount(raw: string | string[] | undefined): number | undefined {
  const s = coerceString(raw);
  if (!s) return undefined;
  // strip currency symbols and spaces, keep digits / dot / comma
  const cleaned = s.replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n <= 0) return undefined;
  return n;
}

function parseDate(raw: string | string[] | undefined): string {
  const s = coerceString(raw);
  if (!s) return todayIso();
  // accept YYYY-MM-DD prefix inside any string (ISO date or datetime)
  const match = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return todayIso();
  const d = new Date(match[1]);
  if (isNaN(d.getTime())) return todayIso();
  return match[1];
}

function parseMerchant(raw: string | string[] | undefined): string | undefined {
  const s = coerceString(raw);
  if (!s) return undefined;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseSource(raw: string | string[] | undefined): ShortcutSource {
  const s = coerceString(raw)?.toLowerCase();
  return s === 'applepay' ? 'applepay' : 'shortcut';
}

/**
 * Normalizes whatever params arrive from the Shortcuts deep link.
 * Every field is optional — only `date` and `source` always resolve to a value.
 * Unknown extra keys are preserved in `rawParams` for future use.
 */
export function parseShortcutParams(
  params: Record<string, string | string[] | undefined>
): ParsedShortcutTransaction {
  return {
    amount:       parseAmount(params.amount),
    merchant:     parseMerchant(params.merchant),
    date:         parseDate(params.date),
    card:         parseMerchant(params.card),
    categoryHint: parseMerchant(params.category ?? params.categoryHint),
    source:       parseSource(params.source),
    rawParams:    params,
  };
}
