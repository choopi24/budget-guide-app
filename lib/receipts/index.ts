// Public entry point for receipt scanning.
//
// Provider selection:
//   EXPO_PUBLIC_RECEIPT_SCAN_URL set  →  remote provider (calls your backend)
//   EXPO_PUBLIC_RECEIPT_SCAN_URL unset →  mock provider  (feature unavailable)
//
// The rest of the app imports only from this file — provider details stay internal.

import { classifyReceiptBucket } from '../receiptClassifier';
import { mockProvider } from './mockProvider';
import type { ReceiptScanProvider } from './provider';
import { createRemoteProvider } from './remoteProvider';
import type { ExtractedReceipt } from './types';

export type { ExtractedReceipt, ExtractionErrorCode } from './types';
export { ReceiptExtractionError } from './types';

const endpointUrl = (process.env.EXPO_PUBLIC_RECEIPT_SCAN_URL ?? '').trim();

/** True when a backend endpoint is configured and receipt scanning is available. */
export const isReceiptScanConfigured = endpointUrl.length > 0;

if (__DEV__) {
  console.log('[receipt] Provider:', isReceiptScanConfigured ? 'remote' : 'none (scanning unavailable)');
}

const _provider: ReceiptScanProvider = isReceiptScanConfigured
  ? createRemoteProvider(endpointUrl)
  : mockProvider;

export async function extractReceiptData(base64Image: string): Promise<ExtractedReceipt> {
  const raw = await _provider.extract(base64Image);
  // Run the local keyword classifier over the returned fields.
  // This client-side pass improves category accuracy regardless of which
  // backend model produced the extraction.
  return {
    ...raw,
    categorySuggestion: classifyReceiptBucket({
      merchant:     raw.merchant,
      items:        raw.items,
      rawText:      raw.rawText,
      aiSuggestion: raw.categorySuggestion,
    }),
  };
}
