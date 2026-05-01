// Pure calculator engine — no React, no DB, no side effects.

export type CalcResult =
  | { ok: true; values: Record<string, string> }
  | { ok: false; error: string };

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Rounds to the nearest integer and formats with thousands separators. */
function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** Formats a number with up to 2 decimal places (for % totals in error messages). */
function fmt2(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Input parsing ─────────────────────────────────────────────────────────────

/** Strips thousands commas, trims whitespace, returns null if not a finite number. */
export function parseNum(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ─── Compound Interest ────────────────────────────────────────────────────────
// FV = P·(1+r)^n  +  PMT·[(1+r)^n − 1] / r   where r = annual_rate/12/100
// When r = 0: FV = P + PMT·n

export function compoundInterest(vals: Record<string, string>): CalcResult {
  const principal = parseNum(vals.principal ?? '');
  const annualRate = parseNum(vals.annual_rate ?? '');
  const years = parseNum(vals.years ?? '');
  const monthlyDeposit = parseNum(vals.monthly_deposit ?? '') ?? 0;

  if (principal === null || principal <= 0)
    return { ok: false, error: 'Initial amount must be greater than 0.' };
  if (annualRate === null || annualRate < 0 || annualRate > 100)
    return { ok: false, error: 'Annual return must be between 0 and 100%.' };
  if (years === null || years <= 0) return { ok: false, error: 'Duration must be greater than 0.' };
  if (years > 100) return { ok: false, error: 'Duration must be 100 years or less.' };
  if (monthlyDeposit < 0) return { ok: false, error: 'Monthly deposit must be 0 or more.' };

  const r = annualRate / 100 / 12;
  const n = Math.round(years * 12);

  let finalValue: number;
  if (r === 0) {
    finalValue = principal + monthlyDeposit * n;
  } else {
    const growth = Math.pow(1 + r, n);
    finalValue = principal * growth + monthlyDeposit * ((growth - 1) / r);
  }

  const totalContributed = principal + monthlyDeposit * n;
  const interestEarned = finalValue - totalContributed;

  return {
    ok: true,
    values: {
      final_value: fmt(finalValue),
      total_contributed: fmt(totalContributed),
      interest_earned: fmt(interestEarned),
    },
  };
}

// ─── Net Salary (estimate) ────────────────────────────────────────────────────
// net_monthly = gross − (gross × income_tax%) − (gross × ni%) − other_deductions
// This is a simplified model; actual take-home varies by country and tax bracket.

export function netSalary(vals: Record<string, string>): CalcResult {
  const gross = parseNum(vals.gross_monthly ?? '');
  const incomeTaxRate = parseNum(vals.income_tax_rate ?? '');
  const niRate = parseNum(vals.ni_rate ?? '');
  const otherDeductions = parseNum(vals.other_deductions ?? '') ?? 0;

  if (gross === null || gross <= 0)
    return { ok: false, error: 'Monthly gross salary must be greater than 0.' };
  if (incomeTaxRate === null || incomeTaxRate < 0 || incomeTaxRate > 100)
    return { ok: false, error: 'Income tax rate must be between 0 and 100%.' };
  if (niRate === null || niRate < 0 || niRate > 100)
    return { ok: false, error: 'Social / NI rate must be between 0 and 100%.' };
  if (incomeTaxRate + niRate > 100)
    return { ok: false, error: 'Combined tax and NI rates exceed 100%.' };
  if (otherDeductions < 0) return { ok: false, error: 'Other deductions must be 0 or more.' };

  const incomeTax = gross * (incomeTaxRate / 100);
  const ni = gross * (niRate / 100);
  const netMonthly = gross - incomeTax - ni - otherDeductions;
  const netAnnual = netMonthly * 12;
  const taxMonthly = incomeTax + ni;

  return {
    ok: true,
    values: {
      net_monthly: fmt(netMonthly),
      net_annual: fmt(netAnnual),
      tax_monthly: fmt(taxMonthly),
    },
  };
}

// ─── Loan Payment ─────────────────────────────────────────────────────────────
// Standard amortisation: M = P·[r(1+r)^n] / [(1+r)^n − 1]
// When r = 0: M = P / n

export function loanPayment(vals: Record<string, string>): CalcResult {
  const loanAmount = parseNum(vals.loan_amount ?? '');
  const annualRate = parseNum(vals.annual_rate ?? '');
  const termYears = parseNum(vals.term_years ?? '');

  if (loanAmount === null || loanAmount <= 0)
    return { ok: false, error: 'Loan amount must be greater than 0.' };
  if (annualRate === null || annualRate < 0 || annualRate > 100)
    return { ok: false, error: 'Annual interest rate must be between 0 and 100%.' };
  if (termYears === null || termYears <= 0)
    return { ok: false, error: 'Loan term must be greater than 0.' };
  if (termYears > 50) return { ok: false, error: 'Loan term must be 50 years or less.' };

  const n = Math.round(termYears * 12);
  const r = annualRate / 100 / 12;

  let monthlyPayment: number;
  if (r === 0) {
    monthlyPayment = loanAmount / n;
  } else {
    const factor = Math.pow(1 + r, n);
    monthlyPayment = (loanAmount * r * factor) / (factor - 1);
  }

  const totalPaid = monthlyPayment * n;
  const totalInterest = totalPaid - loanAmount;

  return {
    ok: true,
    values: {
      monthly_payment: fmt(monthlyPayment),
      total_paid: fmt(totalPaid),
      total_interest: fmt(totalInterest),
    },
  };
}

// ─── Savings Goal ─────────────────────────────────────────────────────────────
// Simulates month-by-month growth until balance ≥ target.
// balance_(n+1) = balance_n × (1 + monthly_rate) + monthly_contribution
// Caps at 1,200 months (100 years) to avoid infinite loops.

const SAVINGS_GOAL_MAX_MONTHS = 1200;

export function savingsGoal(vals: Record<string, string>): CalcResult {
  const target = parseNum(vals.target ?? '');
  const currentSavings = parseNum(vals.current_savings ?? '') ?? 0;
  const monthlyContribution = parseNum(vals.monthly_contribution ?? '');
  const annualReturn = parseNum(vals.annual_return ?? '') ?? 0;

  if (target === null || target <= 0)
    return { ok: false, error: 'Target amount must be greater than 0.' };
  if (currentSavings < 0) return { ok: false, error: 'Current savings must be 0 or more.' };
  if (currentSavings >= target)
    return { ok: false, error: 'Current savings already meet or exceed the target.' };
  if (monthlyContribution === null || monthlyContribution <= 0)
    return { ok: false, error: 'Monthly contribution must be greater than 0.' };
  if (annualReturn < 0 || annualReturn > 100)
    return { ok: false, error: 'Expected annual return must be between 0 and 100%.' };

  const monthlyRate = annualReturn / 100 / 12;
  let balance = currentSavings;
  let months = 0;

  while (balance < target) {
    balance =
      monthlyRate > 0
        ? balance * (1 + monthlyRate) + monthlyContribution
        : balance + monthlyContribution;
    months++;
    if (months > SAVINGS_GOAL_MAX_MONTHS) {
      return {
        ok: false,
        error: 'Goal cannot be reached within 100 years with these inputs.',
      };
    }
  }

  const totalContributed = currentSavings + monthlyContribution * months;
  const interestEarned = balance - totalContributed;

  return {
    ok: true,
    values: {
      months_to_goal: months.toString(),
      total_contributed: fmt(totalContributed),
      interest_earned: fmt(interestEarned),
    },
  };
}

// ─── Budget Split ─────────────────────────────────────────────────────────────
// Simple proportional split — percentages must sum to exactly 100.

export function budgetSplit(vals: Record<string, string>): CalcResult {
  const income = parseNum(vals.monthly_income ?? '');
  const mustPct = parseNum(vals.must_pct ?? '');
  const wantPct = parseNum(vals.want_pct ?? '');
  const investPct = parseNum(vals.invest_pct ?? '');

  if (income === null || income <= 0)
    return { ok: false, error: 'Monthly net income must be greater than 0.' };
  if (mustPct === null || mustPct < 0 || mustPct > 100)
    return { ok: false, error: 'Must % must be between 0 and 100.' };
  if (wantPct === null || wantPct < 0 || wantPct > 100)
    return { ok: false, error: 'Want % must be between 0 and 100.' };
  if (investPct === null || investPct < 0 || investPct > 100)
    return { ok: false, error: 'Invest % must be between 0 and 100.' };

  const total = mustPct + wantPct + investPct;
  if (Math.abs(total - 100) > 0.01)
    return {
      ok: false,
      error: `Percentages must add up to 100% (currently ${fmt2(total)}%).`,
    };

  return {
    ok: true,
    values: {
      must_amount: fmt((income * mustPct) / 100),
      want_amount: fmt((income * wantPct) / 100),
      invest_amount: fmt((income * investPct) / 100),
    },
  };
}

// ─── Emergency Fund ───────────────────────────────────────────────────────────
// fund_target   = monthly_expenses × months_to_cover
// months_to_build = ⌈fund_target / monthly_saving⌉

export function emergencyFund(vals: Record<string, string>): CalcResult {
  const monthlyExpenses = parseNum(vals.monthly_expenses ?? '');
  const monthsToCover = parseNum(vals.months_to_cover ?? '') ?? 6;
  const monthlySaving = parseNum(vals.monthly_saving ?? '');

  if (monthlyExpenses === null || monthlyExpenses <= 0)
    return { ok: false, error: 'Monthly expenses must be greater than 0.' };
  if (monthsToCover <= 0) return { ok: false, error: 'Months to cover must be greater than 0.' };
  if (monthsToCover > 24) return { ok: false, error: 'Months to cover must be 24 or less.' };
  if (monthlySaving === null || monthlySaving <= 0)
    return { ok: false, error: 'Monthly saving capacity must be greater than 0.' };

  const fundTarget = monthlyExpenses * monthsToCover;
  const monthsToBuild = Math.ceil(fundTarget / monthlySaving);

  return {
    ok: true,
    values: {
      fund_target: fmt(fundTarget),
      months_to_build: monthsToBuild.toString(),
    },
  };
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export function compute(id: string, vals: Record<string, string>): CalcResult {
  switch (id) {
    case 'compound':
      return compoundInterest(vals);
    case 'salary':
      return netSalary(vals);
    case 'loan':
      return loanPayment(vals);
    case 'savings':
      return savingsGoal(vals);
    case 'budget':
      return budgetSplit(vals);
    case 'emergency':
      return emergencyFund(vals);
    default:
      return { ok: false, error: `Unknown calculator: ${id}` };
  }
}
