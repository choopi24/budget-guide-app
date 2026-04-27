import type { ExtractedReceipt } from './types';

export interface ReceiptScanProvider {
  extract(base64Image: string): Promise<ExtractedReceipt>;
}
