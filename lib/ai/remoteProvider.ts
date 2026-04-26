import type { BudgetAnalysisProvider } from './provider';
import type { AnalysisInput, BudgetAnalysisResponse } from './types';

/**
 * Future remote provider — wire your backend here.
 *
 * When ready to connect a real backend:
 *   1. Set EXPO_PUBLIC_AI_ENDPOINT in .env to your API URL.
 *   2. Set EXPO_PUBLIC_AI_API_KEY in .env if your endpoint requires auth.
 *      (For a proper backend proxy, keep the real secret server-side and
 *       issue short-lived session tokens to the client instead.)
 *   3. Flip AI_PROVIDER to 'remote' in lib/ai/index.ts (or via the env var).
 *   4. Validate the response shape in normalizeResponse() before trusting it.
 *
 * The endpoint must accept POST with AnalysisInput as JSON body and
 * return BudgetAnalysisResponse as JSON. No other contract changes needed.
 */
export class RemoteBudgetAnalysisProvider implements BudgetAnalysisProvider {
  private readonly endpoint: string;
  private readonly apiKey: string | null;

  constructor() {
    this.endpoint = process.env.EXPO_PUBLIC_AI_ENDPOINT ?? '';
    // Optional — omit EXPO_PUBLIC_AI_API_KEY for endpoints that use
    // session cookies, IP allowlists, or a backend-proxy auth model.
    this.apiKey = process.env.EXPO_PUBLIC_AI_API_KEY ?? null;
  }

  async analyze(input: AnalysisInput): Promise<BudgetAnalysisResponse> {
    if (!this.endpoint) {
      throw new Error(
        'RemoteBudgetAnalysisProvider: EXPO_PUBLIC_AI_ENDPOINT is not set. ' +
        'Add it to your .env file or switch AI_PROVIDER back to "mock" in lib/ai/index.ts.'
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
    } catch {
      throw new Error('Could not reach the analysis service. Check your connection and try again.');
    }

    if (response.status === 401) {
      throw new Error(
        'Analysis service rejected the request (401). ' +
        'Check that EXPO_PUBLIC_AI_API_KEY is correct in your .env file.'
      );
    }
    if (!response.ok) {
      throw new Error(`Analysis service returned HTTP ${response.status}. Try again.`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('Analysis service returned an unreadable response. Try again.');
    }

    // TODO: add runtime shape validation here (e.g. zod) before the cast
    return data as BudgetAnalysisResponse;
  }
}
