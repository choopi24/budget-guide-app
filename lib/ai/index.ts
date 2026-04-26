/**
 * AI budget analysis — public entry point.
 *
 * Usage:
 *   import { buildAnalysisInput } from '../lib/ai/buildAnalysisInput';
 *   import { analyzeBudget } from '../lib/ai';
 *
 *   const input  = buildAnalysisInput({ homeData, priorMonths, recentExpenses, userName });
 *   const result = await analyzeBudget(input);
 *
 * To switch providers:
 *   Option A (env var):  EXPO_PUBLIC_AI_PROVIDER=remote in .env
 *   Option B (hardcode): change AI_PROVIDER below
 *
 * 'mock'   → MockBudgetAnalysisProvider  — no network, data-driven mock outputs
 * 'remote' → RemoteBudgetAnalysisProvider — requires EXPO_PUBLIC_AI_ENDPOINT
 */

import { MockBudgetAnalysisProvider } from './mockProvider';
import type { BudgetAnalysisProvider } from './provider';
import { RemoteBudgetAnalysisProvider } from './remoteProvider';
import type { AnalysisInput, BudgetAnalysisResponse } from './types';

type ProviderMode = 'mock' | 'remote';

const AI_PROVIDER: ProviderMode =
  (process.env.EXPO_PUBLIC_AI_PROVIDER as ProviderMode | undefined) ?? 'mock';

function createProvider(): BudgetAnalysisProvider {
  if (AI_PROVIDER === 'remote') return new RemoteBudgetAnalysisProvider();
  return new MockBudgetAnalysisProvider();
}

const provider = createProvider();

export async function analyzeBudget(input: AnalysisInput): Promise<BudgetAnalysisResponse> {
  return provider.analyze(input);
}

// Re-export types and the builder so callers only need one import path
export { buildAnalysisInput } from './buildAnalysisInput';
export type { BuildAnalysisInputParams } from './buildAnalysisInput';
export type {
  AnalysisInput,
  BudgetAnalysisResponse,
  BehaviorPattern,
  BudgetRisk,
  BudgetSuggestion,
  BucketSignal,
  BucketStatus,
  ExpenseSample,
  MerchantSummary,
  MonthPhase,
  MonthProgress,
  MonthSnapshot,
  PriorMonthDelta,
} from './types';
