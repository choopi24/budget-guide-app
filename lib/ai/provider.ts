import type { AnalysisInput, BudgetAnalysisResponse } from './types';

/**
 * Implement this interface to plug in any analysis backend.
 * The active provider is selected in lib/ai/index.ts.
 *
 * The input is a pre-built AnalysisInput (from lib/ai/buildAnalysisInput.ts)
 * so providers receive compact, derived signals rather than raw DB rows.
 */
export interface BudgetAnalysisProvider {
  /**
   * Analyse the user's budget and return coaching insights.
   * Implementations should never throw for expected conditions (empty data,
   * network unavailable) — return a degraded response instead.
   */
  analyze(input: AnalysisInput): Promise<BudgetAnalysisResponse>;
}
