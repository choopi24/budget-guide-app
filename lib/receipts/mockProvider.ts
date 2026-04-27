import type { ReceiptScanProvider } from './provider';
import { ReceiptExtractionError } from './types';

// Used when no backend endpoint is configured.
// Returns a clean "not available" error — no vendor names, no setup instructions.
export const mockProvider: ReceiptScanProvider = {
  async extract(): Promise<never> {
    throw new ReceiptExtractionError(
      'Receipt scanning is not available yet.',
      'not_configured',
    );
  },
};
