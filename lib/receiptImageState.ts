let _pendingUri: string | null = null;

export function setPendingReceiptUri(uri: string): void {
  _pendingUri = uri;
}

export function clearPendingReceiptUri(): void {
  _pendingUri = null;
}

export function getPendingReceiptUri(): string | null {
  return _pendingUri;
}
