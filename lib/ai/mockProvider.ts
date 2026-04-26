import type { SupportedCurrency } from '../../db/settings';
import { formatCentsToMoney } from '../money';
import type { BudgetGrade } from '../grade';
import type { BudgetAnalysisProvider } from './provider';
import type {
  AnalysisInput,
  BehaviorPattern,
  BudgetAnalysisResponse,
  BudgetRisk,
  BudgetSuggestion,
  BucketSignal,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: SupportedCurrency): string {
  return formatCentsToMoney(amount, currency);
}

function sig(input: AnalysisInput, bucket: 'must' | 'want' | 'invest'): BucketSignal {
  return input.bucketSignals.find((s) => s.bucket === bucket)!;
}

function phaseLabel(phase: string): string {
  if (phase === 'early') return 'early in the month';
  if (phase === 'mid')   return 'mid-month';
  return 'in the final stretch of the month';
}

// ── Mock provider ─────────────────────────────────────────────────────────────

export class MockBudgetAnalysisProvider implements BudgetAnalysisProvider {
  async analyze(input: AnalysisInput): Promise<BudgetAnalysisResponse> {
    const name   = input.userName?.split(' ')[0] ?? 'there';
    const must   = sig(input, 'must');
    const want   = sig(input, 'want');
    const invest = sig(input, 'invest');

    return {
      summary:          buildSummary(name, input, must, want, invest),
      behaviorPatterns: buildPatterns(input, must, want, invest),
      risks:            buildRisks(must, want, invest, input),
      suggestions:      buildSuggestions(must, want, invest, input),
      encouragement:    buildEncouragement(name, input.currentGrade, input.priorGrades),
      scoreImpactNote:  input.currentGrade === 'S' ? null : buildScoreImpact(must, want, invest),
      generatedAt:      new Date().toISOString(),
    };
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

function buildSummary(
  name: string,
  input: AnalysisInput,
  must: BucketSignal,
  want: BucketSignal,
  invest: BucketSignal,
): string {
  const phase = phaseLabel(input.monthProgress.phase);
  const grade = input.currentGrade;

  if (must.status === 'over') {
    return `${name}, you're ${phase} and Must spending is already at ${must.usedPct}% of budget. Essential costs being over budget has the biggest impact on your grade — it's worth a close look at what drove that.`;
  }
  if (want.status === 'over') {
    return `You're ${phase} with Want spending at ${want.usedPct}% of its budget, ${name}. Discretionary spending is the most actionable lever you have — pulling back now can still move your final grade.`;
  }
  if (want.status === 'at_risk' && want.projectedPct != null) {
    return `${name}, Want spending is at ${want.usedPct}% used ${phase}. At this pace the month is projecting to ${want.projectedPct}% of that budget — a few intentional choices now can still land you under.`;
  }
  if (must.status === 'on_track' && want.status === 'on_track' && invest.usedPct >= 80) {
    return `Strong month so far, ${name}. You're ${phase} with all three buckets on track and savings looking solid. Your current grade is ${grade} — keep the discipline through the end.`;
  }
  if (invest.status === 'under' && input.monthProgress.phase !== 'early') {
    return `Spending is well-controlled, ${name}, but savings are lagging at ${invest.usedPct}% of your Keep target. ${input.monthProgress.phase === 'late' ? `There's still time this month` : 'Addressing that now'} could push your grade up.`;
  }
  return `You're ${phase}, ${name}, currently sitting at a ${grade} grade. ${
    want.projectedPct != null
      ? `Want spending is on track to close around ${want.projectedPct}% of budget.`
      : `Keep an eye on Want spending as the month progresses.`
  }`;
}

// ── Behavior patterns ─────────────────────────────────────────────────────────

function buildPatterns(
  input: AnalysisInput,
  must: BucketSignal,
  want: BucketSignal,
  invest: BucketSignal,
): BehaviorPattern[] {
  const patterns: BehaviorPattern[] = [];
  const { priorMonthDelta, topMerchants, monthProgress } = input;

  // Must status
  if (must.status === 'over') {
    patterns.push({
      label: 'Essentials over budget',
      detail: `Must spending is at ${must.usedPct}% of budget. Check for one-off charges or recent price increases in recurring bills.`,
      sentiment: 'negative',
    });
  } else if (must.status === 'at_risk') {
    const proj = must.projectedPct != null ? `, projecting to ${must.projectedPct}%` : '';
    patterns.push({
      label: 'Essentials approaching limit',
      detail: `Must usage is ${must.usedPct}%${proj}. Worth reviewing before any unexpected essential expenses arrive.`,
      sentiment: 'neutral',
    });
  } else {
    patterns.push({
      label: 'Essentials under control',
      detail: `Must costs are at ${must.usedPct}% of budget — fixed costs are well-managed.`,
      sentiment: 'positive',
    });
  }

  // Want trend vs prior month
  if (priorMonthDelta) {
    const delta = priorMonthDelta.wantUsedPctDelta;
    if (delta > 12) {
      patterns.push({
        label: 'Discretionary spending up from last month',
        detail: `Want spending is ${delta}pp higher than the same point last month. Dining, entertainment, and impulse purchases tend to drive this.`,
        sentiment: 'negative',
      });
    } else if (delta < -10) {
      patterns.push({
        label: 'Improved discretionary control',
        detail: `Want spending is ${Math.abs(delta)}pp lower than last month at this stage — a meaningful improvement.`,
        sentiment: 'positive',
      });
    }
  }

  // Repeat merchant pattern
  const repeatWant = topMerchants.find((m) => m.bucket === 'want' && m.count >= 3);
  const repeatMust = topMerchants.find((m) => m.bucket === 'must' && m.count >= 3);
  if (repeatWant) {
    patterns.push({
      label: 'Frequent discretionary visits',
      detail: `"${repeatWant.title}" appears ${repeatWant.count} times this month totalling ${fmt(repeatWant.totalCents, input.currency)}. Worth checking if this aligns with your priorities.`,
      sentiment: 'neutral',
    });
  } else if (repeatMust) {
    patterns.push({
      label: 'Consistent essential spending',
      detail: `"${repeatMust.title}" shows up ${repeatMust.count} times for ${fmt(repeatMust.totalCents, input.currency)} — ensure it's properly captured in your Must budget.`,
      sentiment: 'positive',
    });
  }

  // Savings discipline
  if (invest.usedPct >= 90) {
    patterns.push({
      label: 'Savings target on track',
      detail: `${invest.usedPct}% of your Keep goal is set aside — that compounds meaningfully over time.`,
      sentiment: 'positive',
    });
  } else if (invest.status === 'under' && monthProgress.phase !== 'early') {
    patterns.push({
      label: 'Savings behind target',
      detail: `Only ${invest.usedPct}% of your Keep goal has been set aside${monthProgress.phase === 'late' ? ' with little time left this month' : ''}. Even a partial transfer helps the grade.`,
      sentiment: 'negative',
    });
  }

  return patterns.slice(0, 4);
}

// ── Risks ─────────────────────────────────────────────────────────────────────

function buildRisks(
  must: BucketSignal,
  want: BucketSignal,
  invest: BucketSignal,
  input: AnalysisInput,
): BudgetRisk[] {
  const risks: BudgetRisk[] = [];
  const { monthProgress } = input;
  const daysLeft = monthProgress.daysInMonth - monthProgress.dayOfMonth;

  if (must.status === 'over') {
    const overBy = must.usedPct - 100;
    risks.push({
      area:        'must',
      severity:    overBy > 15 ? 'high' : 'medium',
      description: `Essential spending is ${overBy}% over budget. If this is a one-off (medical, car repair), flag it. If recurring, the budget baseline may need updating.`,
    });
  }

  if (want.status === 'over') {
    risks.push({
      area:        'want',
      severity:    want.usedPct > 130 ? 'high' : 'medium',
      description: `Discretionary spending is ${want.usedPct - 100}% over budget — a significant drag on this month's grade.`,
    });
  } else if (want.projectedPct != null && want.projectedPct > 108) {
    risks.push({
      area:        'want',
      severity:    want.projectedPct > 125 ? 'high' : 'low',
      description: `Want spending is projecting to close at ~${want.projectedPct}% of budget. You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} to course-correct.`,
    });
  }

  if (invest.usedPct < 20 && monthProgress.phase === 'late' && invest.budgetCents > 0) {
    risks.push({
      area:        'savings',
      severity:    'medium',
      description: `With ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left, only ${invest.usedPct}% of your savings target is set aside. A transfer now avoids closing the month at zero.`,
    });
  }

  return risks.slice(0, 3);
}

// ── Suggestions ───────────────────────────────────────────────────────────────

function buildSuggestions(
  must: BucketSignal,
  want: BucketSignal,
  invest: BucketSignal,
  input: AnalysisInput,
): BudgetSuggestion[] {
  const suggestions: BudgetSuggestion[] = [];
  const { topMerchants, monthProgress } = input;

  // Highest-leverage: wants over or at risk
  if (want.status === 'over' || want.status === 'at_risk') {
    const overspendCents = Math.max(0, want.spentCents - want.budgetCents);
    suggestions.push({
      title:                'Designate one "no spend" day per week',
      detail:               `Removing 4 discretionary decision points per month is one of the most reliable ways to reduce Want creep without feeling restricted.`,
      savingEstimateCents:  overspendCents > 0 ? Math.round(overspendCents * 0.3) : undefined,
    });
  }

  // Savings gap
  if ((invest.status === 'under' || invest.usedPct < 50) && invest.budgetCents > 0) {
    const missingCents = invest.budgetCents - invest.spentCents;
    if (missingCents > 0) {
      suggestions.push({
        title:               'Schedule a savings transfer this week',
        detail:              `You're ${fmt(missingCents, input.currency)} short of your Keep target. Automating this transfer removes the decision entirely and protects your grade.`,
        savingEstimateCents: missingCents,
      });
    }
  }

  // Top repeat Want merchant
  const topWant = topMerchants.find((m) => m.bucket === 'want' && m.count >= 2);
  if (topWant) {
    suggestions.push({
      title:               `Review your "${topWant.title}" habit`,
      detail:              `${topWant.count} visits totalling ${fmt(topWant.totalCents, input.currency)} this month. Reducing by one visit per week could free up ${fmt(Math.round(topWant.totalCents / topWant.count), input.currency)} a week.`,
      savingEstimateCents: Math.round(topWant.totalCents / topWant.count),
    });
  }

  // Must audit if over
  if (must.status === 'over') {
    suggestions.push({
      title:  'Audit recurring subscriptions',
      detail: 'Over-budget Must spending is often partly driven by forgotten subscriptions. A 10-minute bank statement review commonly surfaces at least one to cancel.',
    });
  }

  // End-of-month push when relevant
  if (monthProgress.phase === 'late' && (want.status === 'at_risk' || invest.usedPct < 60)) {
    suggestions.push({
      title:  'Make the last few days count',
      detail: `You're in the final stretch. Holding Want spending flat${invest.usedPct < 60 ? ' and moving funds to savings' : ''} in these last days can still shift your final grade.`,
    });
  }

  // Nudge to grow savings target if already hitting it comfortably
  if (invest.usedPct >= 100 && invest.status !== 'under' && monthProgress.phase !== 'early') {
    suggestions.push({
      title:  'Consider raising your Keep target by 2–3%',
      detail: `You're consistently hitting your savings goal — a small increase now compounds significantly over a year.`,
    });
  }

  return suggestions.slice(0, 4);
}

// ── Encouragement ─────────────────────────────────────────────────────────────

function buildEncouragement(
  name: string,
  grade: BudgetGrade,
  priorGrades: BudgetGrade[],
): string {
  if (grade === 'S') {
    return `Perfect across every bucket, ${name}. An S grade is rare — it means you're living intentionally within your means and building toward something real.`;
  }
  if (grade === 'A+' || grade === 'A') {
    return `Excellent discipline, ${name}. An ${grade} grade puts you well ahead of where most people are — keep the habits that got you here.`;
  }
  if (grade === 'B') {
    const improving = priorGrades.length > 0 && ['C', 'D', 'F'].includes(priorGrades[0]);
    if (improving) {
      return `A B after a tougher month is a real win, ${name}. The trend matters — you're moving in the right direction.`;
    }
    return `Solid work, ${name}. A B is close to A territory — one or two small adjustments in Want spending is usually all it takes.`;
  }
  if (grade === 'C') {
    return `A C gives you a clear foundation to build from, ${name}. Most improvements come from a single category. Find your biggest leak and the grade usually follows.`;
  }
  return `A tough stretch, ${name}, but reviewing it means you're taking it seriously. One focused change — even tightening Want by 20% — moves the needle noticeably.`;
}

// ── Score impact ──────────────────────────────────────────────────────────────

function buildScoreImpact(
  must: BucketSignal,
  want: BucketSignal,
  invest: BucketSignal,
): string {
  if (must.status === 'over') {
    return `Must carries 55% of the grade calculation — getting it back under budget is the single highest-impact change available to you right now.`;
  }
  if (want.status === 'over' || want.status === 'at_risk') {
    const ref = want.projectedPct != null
      ? `(projecting ${want.projectedPct}% by month-end)`
      : `(currently at ${want.usedPct}%)`;
    return `Bringing Want spending under budget ${ref} is the most actionable path to a better grade.`;
  }
  if (invest.usedPct < 50 && invest.budgetCents > 0) {
    return `Hitting your savings target adds the Keep bonus to your score — often the difference between a B and an A.`;
  }
  return `You're close to the next grade boundary. Staying consistent through the end of the month is usually all it takes.`;
}
