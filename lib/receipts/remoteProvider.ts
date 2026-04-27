// Remote receipt scanning provider.
//
// Calls a backend endpoint that handles the vision model call on the server.
// The app never calls any AI API directly — it only talks to your backend.
//
// ── Future OpenAI integration point ──────────────────────────────────────────
// Your backend should:
//   1. Accept  POST { image: "<base64 jpeg>" }
//   2. Call    OpenAI Chat Completions with model "gpt-4o" and image_url content
//   3. Parse   the structured JSON from the model response
//   4. Return  an ExtractedReceipt-shaped JSON body to the client
//
// The normalization logic below handles both:
//   a) Backends that return a clean ExtractedReceipt JSON object directly
//   b) Backends that forward the raw AI text response (string body or
//      { content: [{ text: "..." }] } envelope) — useful during early dev
// ─────────────────────────────────────────────────────────────────────────────

import type { ReceiptScanProvider } from './provider';
import { ReceiptExtractionError, type ExtractedReceipt } from './types';

// ── Response normalization ────────────────────────────────────────────────────

function extractJsonObject(text: string): Record<string, unknown> {
  try { return JSON.parse(text); } catch {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  const block = text.match(/\{[\s\S]*\}/);
  if (block) {
    try { return JSON.parse(block[0]); } catch {}
  }

  throw new Error('No JSON found in response text');
}

function normalizeResponse(raw: Record<string, unknown>): ExtractedReceipt {
  const merchant =
    typeof raw.merchant === 'string' && raw.merchant.trim()
      ? raw.merchant.trim()
      : undefined;

  let amount: number | undefined;
  if (typeof raw.amount === 'number' && raw.amount > 0) {
    amount = Math.round(raw.amount * 100) / 100;
  } else if (typeof raw.amount === 'string') {
    const n = parseFloat((raw.amount as string).replace(/[^0-9.]/g, ''));
    if (isFinite(n) && n > 0) amount = Math.round(n * 100) / 100;
  }

  const currency =
    typeof raw.currency === 'string' && raw.currency.trim()
      ? raw.currency.trim().toUpperCase().slice(0, 3)
      : undefined;

  let date: string | undefined;
  if (typeof raw.date === 'string') {
    const m = raw.date.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) date = m[1];
    }
  }

  const items: string[] | undefined = Array.isArray(raw.items)
    ? (raw.items as unknown[])
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 10)
    : undefined;

  const amountConfidence =
    typeof raw.amountConfidence === 'number'
      ? Math.max(0, Math.min(1, raw.amountConfidence))
      : undefined;

  const categorySuggestion: 'must' | 'want' | undefined =
    raw.categorySuggestion === 'must' ? 'must'
    : raw.categorySuggestion === 'want' ? 'want'
    : undefined;

  const confidence =
    typeof raw.confidence === 'number'
      ? Math.max(0, Math.min(1, raw.confidence))
      : undefined;

  const rawText =
    typeof raw.rawText === 'string' && raw.rawText.trim()
      ? raw.rawText.trim()
      : undefined;

  return { merchant, amount, currency, amountConfidence, date, items, categorySuggestion, confidence, rawText };
}

// ── Provider factory ──────────────────────────────────────────────────────────

export function createRemoteProvider(endpointUrl: string): ReceiptScanProvider {
  return {
    async extract(base64Image: string): Promise<ExtractedReceipt> {
      let response: Response;
      try {
        response = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
      } catch {
        throw new ReceiptExtractionError(
          'Could not reach the receipt scanning service. Check your connection and try again.',
          'network_error',
        );
      }

      if (!response.ok) {
        const detail =
          response.status === 429
            ? 'Too many requests. Wait a moment and try again.'
            : `Receipt scanning failed (${response.status}). Try again.`;
        throw new ReceiptExtractionError(detail, 'api_error');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ReceiptExtractionError(
          'Unexpected response from the receipt scanning service. Try again.',
          'parse_error',
        );
      }

      // Unwrap the JSON into a raw record we can normalize.
      // Handles a plain object response or a string body.
      let raw: Record<string, unknown>;
      if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
        raw = body as Record<string, unknown>;
      } else if (typeof body === 'string') {
        try {
          raw = extractJsonObject(body);
        } catch {
          throw new ReceiptExtractionError(
            "The receipt couldn't be read. Try a clearer photo with better lighting.",
            'parse_error',
          );
        }
      } else {
        throw new ReceiptExtractionError(
          'Unexpected response from the receipt scanning service. Try again.',
          'parse_error',
        );
      }

      const result = normalizeResponse(raw);

      if ((result.confidence ?? 1) < 0.15 && !result.merchant && !result.amount) {
        throw new ReceiptExtractionError(
          "This doesn't look like a receipt, or the photo is too blurry to read. Try again with better lighting.",
          'unreadable',
        );
      }

      return result;
    },
  };
}
