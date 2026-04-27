// Shared types for the receipt scanning module.
// Provider-agnostic — no vendor names here.

export type ExtractedReceipt = {
  merchant?:          string;
  amount?:            number;
  currency?:          string;        // e.g. "USD", "ILS" — populated when backend returns it
  amountConfidence?:  number;        // 0–1
  date?:              string;        // YYYY-MM-DD
  items?:             string[];      // line items, max 10
  categorySuggestion?: 'must' | 'want';
  confidence?:        number;        // 0–1 overall extraction confidence
  rawText?:           string;        // brief human-readable summary from the AI
};

export type ExtractionErrorCode =
  | 'not_configured' // no backend endpoint is set up
  | 'network_error'  // could not reach the backend
  | 'api_error'      // backend returned a non-2xx response
  | 'parse_error'    // response body could not be parsed
  | 'unreadable';    // image is not a receipt or confidence is too low

export class ReceiptExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: ExtractionErrorCode,
  ) {
    super(message);
    this.name = 'ReceiptExtractionError';
  }
}
