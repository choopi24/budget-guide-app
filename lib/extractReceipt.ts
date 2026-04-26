import { classifyReceiptBucket } from './receiptClassifier';
import { RECEIPT_EXTRACTION_PROMPT } from './receiptPrompt';

// ── Public types ──────────────────────────────────────────────────────────────

export type ExtractedReceipt = {
  merchant?: string;
  amount?: number;
  amountConfidence?: number;
  date?: string;
  items?: string[];
  categorySuggestion?: 'must' | 'want';
  confidence?: number;
  rawText?: string;
};

export type ExtractionErrorCode =
  | 'key_missing'   // EXPO_PUBLIC_ANTHROPIC_API_KEY not set
  | 'api_error'     // network failure or non-2xx response
  | 'parse_error'   // response couldn't be parsed as JSON
  | 'unreadable';   // image is not a receipt or confidence is too low

export class ReceiptExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: ExtractionErrorCode
  ) {
    super(message);
    this.name = 'ReceiptExtractionError';
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function extractJsonObject(text: string): Record<string, unknown> {
  // 1. Direct parse
  try { return JSON.parse(text); } catch {}

  // 2. Strip markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  // 3. Find the first {...} block in the text
  const block = text.match(/\{[\s\S]*\}/);
  if (block) {
    try { return JSON.parse(block[0]); } catch {}
  }

  throw new Error('No valid JSON found in response');
}

function normalizeExtraction(raw: Record<string, unknown>): ExtractedReceipt {
  // merchant
  const merchant =
    typeof raw.merchant === 'string' && raw.merchant.trim()
      ? raw.merchant.trim()
      : undefined;

  // amount — accept number or numeric string
  let amount: number | undefined;
  if (typeof raw.amount === 'number' && raw.amount > 0) {
    amount = Math.round(raw.amount * 100) / 100;
  } else if (typeof raw.amount === 'string') {
    const n = parseFloat((raw.amount as string).replace(/[^0-9.]/g, ''));
    if (isFinite(n) && n > 0) amount = Math.round(n * 100) / 100;
  }

  // date — require YYYY-MM-DD pattern
  let date: string | undefined;
  if (typeof raw.date === 'string') {
    const m = raw.date.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) date = m[1];
    }
  }

  // items — string array, max 10
  const items: string[] | undefined = Array.isArray(raw.items)
    ? (raw.items as unknown[])
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 10)
    : undefined;

  // amountConfidence — clamped to [0, 1]
  const amountConfidence =
    typeof raw.amountConfidence === 'number'
      ? Math.max(0, Math.min(1, raw.amountConfidence))
      : undefined;

  // categorySuggestion — run through local classifier for better accuracy
  const claudeSuggestion: 'must' | 'want' | undefined =
    raw.categorySuggestion === 'must' ? 'must'
    : raw.categorySuggestion === 'want' ? 'want'
    : undefined;

  const categorySuggestion = classifyReceiptBucket({
    merchant,
    items,
    rawText: typeof raw.rawText === 'string' ? raw.rawText : undefined,
    claudeSuggestion,
  });

  // confidence — clamped to [0, 1]
  const confidence =
    typeof raw.confidence === 'number'
      ? Math.max(0, Math.min(1, raw.confidence))
      : undefined;

  // rawText
  const rawText =
    typeof raw.rawText === 'string' && raw.rawText.trim()
      ? raw.rawText.trim()
      : undefined;

  return { merchant, amount, amountConfidence, date, items, categorySuggestion, confidence, rawText };
}

// ── Main extraction function ──────────────────────────────────────────────────
// ── SWAP POINT ────────────────────────────────────────────────────────────────
// To upgrade or replace the extraction backend, only change the body of this
// function. The signature and return type must stay the same.
//
// `base64Image` is a raw base64-encoded JPEG string (no data-URI prefix),
// returned by expo-image-picker when { base64: true } is passed.

export async function extractReceiptData(base64Image: string): Promise<ExtractedReceipt> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new ReceiptExtractionError(
      'Receipt scanning is not configured. Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.',
      'key_missing'
    );
  }

  // ── Call Claude vision ──────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: RECEIPT_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new ReceiptExtractionError(
      'Could not reach the analysis service. Check your connection and try again.',
      'api_error'
    );
  }

  // ── Handle HTTP errors ──────────────────────────────────────────────────────
  if (!response.ok) {
    const detail = response.status === 401
      ? 'Your API key appears to be invalid. Check EXPO_PUBLIC_ANTHROPIC_API_KEY.'
      : response.status === 429
      ? 'Too many requests. Wait a moment and try again.'
      : `Analysis failed (HTTP ${response.status}). Try again.`;
    throw new ReceiptExtractionError(detail, 'api_error');
  }

  // ── Parse response body ─────────────────────────────────────────────────────
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new ReceiptExtractionError(
      'Unexpected response from analysis service. Try again.',
      'parse_error'
    );
  }

  const rawText: string = body?.content?.[0]?.text ?? '';

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJsonObject(rawText);
  } catch {
    throw new ReceiptExtractionError(
      'The receipt couldn\'t be read. Try a clearer photo with better lighting.',
      'parse_error'
    );
  }

  const result = normalizeExtraction(parsed);

  // Reject if image clearly isn't a receipt
  if ((result.confidence ?? 1) < 0.15 && !result.merchant && !result.amount) {
    throw new ReceiptExtractionError(
      'This doesn\'t look like a receipt, or the photo is too blurry to read. Try again with better lighting.',
      'unreadable'
    );
  }

  return result;
}
