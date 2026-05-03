import {
  compoundInterest,
  netSalary,
  loanPayment,
  savingsGoal,
  budgetSplit,
  emergencyFund,
  compute,
  parseNum,
} from '../lib/calculators';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(r: ReturnType<typeof compute>): Record<string, string> {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('Expected ok result');
  return r.values;
}

function err(r: ReturnType<typeof compute>): string {
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error('Expected error result');
  return r.error;
}

function num(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10);
}

// ─── parseNum ─────────────────────────────────────────────────────────────────

describe('parseNum', () => {
  it('parses plain integer', () => expect(parseNum('1000')).toBe(1000));
  it('parses decimal', () => expect(parseNum('4.5')).toBe(4.5));
  it('strips thousands commas', () => expect(parseNum('10,000')).toBe(10000));
  it('returns null for empty string', () => expect(parseNum('')).toBeNull());
  it('returns null for non-numeric', () => expect(parseNum('abc')).toBeNull());
  it('returns null for Infinity', () => expect(parseNum('Infinity')).toBeNull());
  it('parses negative numbers', () => expect(parseNum('-500')).toBe(-500));
});

// ─── Compound Interest ────────────────────────────────────────────────────────

describe('compoundInterest', () => {
  it('normal case: monthly deposits with annual return', () => {
    const v = ok(
      compoundInterest({
        principal: '10000',
        annual_rate: '7',
        years: '10',
        monthly_deposit: '500',
      }),
    );
    // After 10 years at 7%, final value must exceed simple total
    expect(num(v.final_value)).toBeGreaterThan(num(v.total_contributed));
    // Total contributed = 10000 + 500 * 120
    expect(num(v.total_contributed)).toBe(70000);
  });

  it('single lump sum — no monthly deposit', () => {
    const v = ok(
      compoundInterest({
        principal: '10000',
        annual_rate: '10',
        years: '1',
        monthly_deposit: '0',
      }),
    );
    // FV = 10000 × (1 + 0.1/12)^12 ≈ 11,047
    const fv = num(v.final_value);
    expect(fv).toBeGreaterThan(11000);
    expect(fv).toBeLessThan(11100);
    expect(num(v.interest_earned)).toBeGreaterThan(0);
  });

  it('zero interest rate — result equals simple sum', () => {
    const v = ok(
      compoundInterest({
        principal: '1000',
        annual_rate: '0',
        years: '5',
        monthly_deposit: '100',
      }),
    );
    // FV = 1000 + 100×60 = 7000
    expect(v.final_value).toBe('7,000');
    expect(v.total_contributed).toBe('7,000');
    expect(v.interest_earned).toBe('0');
  });

  it('rejects missing principal', () => {
    const e = err(
      compoundInterest({ principal: '', annual_rate: '7', years: '10', monthly_deposit: '0' }),
    );
    expect(e).toMatch(/Initial amount/);
  });

  it('rejects zero principal', () => {
    const e = err(
      compoundInterest({ principal: '0', annual_rate: '7', years: '10', monthly_deposit: '0' }),
    );
    expect(e).toMatch(/Initial amount/);
  });

  it('rejects negative principal', () => {
    const e = err(
      compoundInterest({ principal: '-500', annual_rate: '7', years: '10', monthly_deposit: '0' }),
    );
    expect(e).toMatch(/Initial amount/);
  });

  it('rejects annual rate above 100', () => {
    const e = err(
      compoundInterest({
        principal: '1000',
        annual_rate: '150',
        years: '10',
        monthly_deposit: '0',
      }),
    );
    expect(e).toMatch(/Annual return/);
  });

  it('rejects negative annual rate', () => {
    const e = err(
      compoundInterest({ principal: '1000', annual_rate: '-1', years: '10', monthly_deposit: '0' }),
    );
    expect(e).toMatch(/Annual return/);
  });

  it('rejects missing years', () => {
    const e = err(
      compoundInterest({ principal: '1000', annual_rate: '7', years: '', monthly_deposit: '0' }),
    );
    expect(e).toMatch(/Duration/);
  });

  it('rejects duration above 100 years', () => {
    const e = err(
      compoundInterest({ principal: '1000', annual_rate: '7', years: '101', monthly_deposit: '0' }),
    );
    expect(e).toMatch(/100 years/);
  });

  it('rejects negative monthly deposit', () => {
    const e = err(
      compoundInterest({
        principal: '1000',
        annual_rate: '7',
        years: '5',
        monthly_deposit: '-100',
      }),
    );
    expect(e).toMatch(/Monthly deposit/);
  });

  it('omitted monthly deposit defaults to 0', () => {
    // monthly_deposit field absent — should not error
    const v = ok(compoundInterest({ principal: '5000', annual_rate: '5', years: '2' }));
    expect(num(v.final_value)).toBeGreaterThan(5000);
  });
});

// ─── Net Salary ───────────────────────────────────────────────────────────────

describe('netSalary', () => {
  it('normal case: 30% tax on 10,000', () => {
    const v = ok(netSalary({ gross_monthly: '10000', tax_rate: '30' }));
    // tax = 3000, net = 7000
    expect(v.net_monthly).toBe('7,000');
    expect(v.tax_monthly).toBe('3,000');
  });

  it('zero tax — gross equals net', () => {
    const v = ok(netSalary({ gross_monthly: '5000', tax_rate: '0' }));
    expect(v.net_monthly).toBe('5,000');
    expect(v.tax_monthly).toBe('0');
  });

  it('100% tax — net is zero', () => {
    const v = ok(netSalary({ gross_monthly: '5000', tax_rate: '100' }));
    expect(v.net_monthly).toBe('0');
    expect(v.tax_monthly).toBe('5,000');
  });

  it('rejects missing gross salary', () => {
    const e = err(netSalary({ gross_monthly: '', tax_rate: '30' }));
    expect(e).toMatch(/[Gg]ross salary/);
  });

  it('rejects zero gross salary', () => {
    const e = err(netSalary({ gross_monthly: '0', tax_rate: '30' }));
    expect(e).toMatch(/[Gg]ross salary/);
  });

  it('rejects negative gross salary', () => {
    const e = err(netSalary({ gross_monthly: '-1000', tax_rate: '30' }));
    expect(e).toMatch(/[Gg]ross salary/);
  });

  it('rejects missing tax rate', () => {
    const e = err(netSalary({ gross_monthly: '10000', tax_rate: '' }));
    expect(e).toMatch(/[Tt]ax rate/);
  });

  it('rejects tax rate above 100', () => {
    const e = err(netSalary({ gross_monthly: '10000', tax_rate: '101' }));
    expect(e).toMatch(/[Tt]ax rate/);
  });

  it('rejects negative tax rate', () => {
    const e = err(netSalary({ gross_monthly: '10000', tax_rate: '-5' }));
    expect(e).toMatch(/[Tt]ax rate/);
  });
});

// ─── Loan Payment ─────────────────────────────────────────────────────────────

describe('loanPayment', () => {
  it('normal case: 25-year mortgage at 4.5%', () => {
    const v = ok(
      loanPayment({
        loan_amount: '500000',
        annual_rate: '4.5',
        term_years: '25',
      }),
    );
    // Known result: ~₪2,778/month
    const payment = num(v.monthly_payment);
    expect(payment).toBeGreaterThan(2700);
    expect(payment).toBeLessThan(2850);
    expect(num(v.total_interest)).toBeGreaterThan(0);
  });

  it('zero interest rate — equal monthly instalments', () => {
    const v = ok(
      loanPayment({
        loan_amount: '12000',
        annual_rate: '0',
        term_years: '1',
      }),
    );
    // 12000 / 12 = 1000/month, zero interest
    expect(v.monthly_payment).toBe('1,000');
    expect(v.total_interest).toBe('0');
    expect(v.total_paid).toBe('12,000');
  });

  it('rejects missing loan amount', () => {
    const e = err(loanPayment({ loan_amount: '', annual_rate: '4.5', term_years: '25' }));
    expect(e).toMatch(/Loan amount/);
  });

  it('rejects negative loan amount', () => {
    const e = err(loanPayment({ loan_amount: '-100', annual_rate: '4.5', term_years: '25' }));
    expect(e).toMatch(/Loan amount/);
  });

  it('rejects interest rate above 100', () => {
    const e = err(loanPayment({ loan_amount: '100000', annual_rate: '150', term_years: '25' }));
    expect(e).toMatch(/interest rate/);
  });

  it('rejects negative interest rate', () => {
    const e = err(loanPayment({ loan_amount: '100000', annual_rate: '-1', term_years: '25' }));
    expect(e).toMatch(/interest rate/);
  });

  it('rejects missing term', () => {
    const e = err(loanPayment({ loan_amount: '100000', annual_rate: '4.5', term_years: '' }));
    expect(e).toMatch(/Loan term/);
  });

  it('rejects term above 50 years', () => {
    const e = err(loanPayment({ loan_amount: '100000', annual_rate: '4', term_years: '51' }));
    expect(e).toMatch(/50 years/);
  });
});

// ─── Savings Goal ─────────────────────────────────────────────────────────────

describe('savingsGoal', () => {
  it('normal case: reach target with monthly contributions and return', () => {
    const v = ok(
      savingsGoal({
        target: '100000',
        current_savings: '0',
        monthly_contribution: '1000',
        annual_return: '5',
      }),
    );
    // ~84 months at 5% annual; total contributed < target (interest makes up the gap)
    const months = parseInt(v.months_to_goal, 10);
    expect(months).toBeGreaterThan(0);
    expect(months).toBeLessThan(120);
    expect(num(v.interest_earned)).toBeGreaterThan(0);
    // completion_date should be a "Month YYYY" string in the future
    expect(v.completion_date).toMatch(/\d{4}/);
  });

  it('existing savings shortens time to goal', () => {
    const v = ok(
      savingsGoal({
        target: '10000',
        current_savings: '9000',
        monthly_contribution: '500',
        annual_return: '0',
      }),
    );
    // Need 1000 more at 500/month = 2 months
    expect(v.months_to_goal).toBe('2');
  });

  it('zero return — simple month count', () => {
    const v = ok(
      savingsGoal({
        target: '6000',
        current_savings: '0',
        monthly_contribution: '1000',
        annual_return: '0',
      }),
    );
    expect(v.months_to_goal).toBe('6');
    expect(v.total_contributed).toBe('6,000');
    expect(v.interest_earned).toBe('0');
  });

  it('rejects missing target', () => {
    const e = err(
      savingsGoal({
        target: '',
        current_savings: '0',
        monthly_contribution: '500',
        annual_return: '0',
      }),
    );
    expect(e).toMatch(/Target amount/);
  });

  it('rejects zero target', () => {
    const e = err(
      savingsGoal({
        target: '0',
        current_savings: '0',
        monthly_contribution: '500',
        annual_return: '0',
      }),
    );
    expect(e).toMatch(/Target amount/);
  });

  it('rejects when current savings already meets target', () => {
    const e = err(
      savingsGoal({
        target: '5000',
        current_savings: '5000',
        monthly_contribution: '500',
        annual_return: '0',
      }),
    );
    expect(e).toMatch(/already meet/);
  });

  it('rejects when current savings exceeds target', () => {
    const e = err(
      savingsGoal({
        target: '5000',
        current_savings: '6000',
        monthly_contribution: '500',
        annual_return: '0',
      }),
    );
    expect(e).toMatch(/already meet/);
  });

  it('rejects zero monthly contribution', () => {
    const e = err(
      savingsGoal({
        target: '10000',
        current_savings: '0',
        monthly_contribution: '0',
        annual_return: '0',
      }),
    );
    expect(e).toMatch(/Monthly contribution/);
  });

  it('rejects return above 100%', () => {
    const e = err(
      savingsGoal({
        target: '10000',
        current_savings: '0',
        monthly_contribution: '500',
        annual_return: '150',
      }),
    );
    expect(e).toMatch(/annual return/);
  });

  it('omitted current_savings defaults to 0', () => {
    const v = ok(
      savingsGoal({
        target: '3000',
        monthly_contribution: '1000',
        annual_return: '0',
      }),
    );
    expect(v.months_to_goal).toBe('3');
  });
});

// ─── Budget Split ─────────────────────────────────────────────────────────────

describe('budgetSplit', () => {
  it('normal case: 50/30/20 split', () => {
    const v = ok(
      budgetSplit({
        monthly_income: '10000',
        must_pct: '50',
        want_pct: '30',
        invest_pct: '20',
      }),
    );
    expect(v.must_amount).toBe('5,000');
    expect(v.want_amount).toBe('3,000');
    expect(v.invest_amount).toBe('2,000');
  });

  it('edge: 0/0/100 — all to invest', () => {
    const v = ok(
      budgetSplit({
        monthly_income: '5000',
        must_pct: '0',
        want_pct: '0',
        invest_pct: '100',
      }),
    );
    expect(v.must_amount).toBe('0');
    expect(v.want_amount).toBe('0');
    expect(v.invest_amount).toBe('5,000');
  });

  it('edge: fractional split (33.33/33.33/33.34)', () => {
    const v = ok(
      budgetSplit({
        monthly_income: '9000',
        must_pct: '33.33',
        want_pct: '33.33',
        invest_pct: '33.34',
      }),
    );
    // Each bucket ≈ 3000
    expect(num(v.must_amount)).toBeCloseTo(3000, -1);
  });

  it('rejects missing income', () => {
    const e = err(
      budgetSplit({ monthly_income: '', must_pct: '50', want_pct: '30', invest_pct: '20' }),
    );
    expect(e).toMatch(/income/);
  });

  it('rejects zero income', () => {
    const e = err(
      budgetSplit({ monthly_income: '0', must_pct: '50', want_pct: '30', invest_pct: '20' }),
    );
    expect(e).toMatch(/income/);
  });

  it('rejects percentages that do not sum to 100', () => {
    const e = err(
      budgetSplit({ monthly_income: '10000', must_pct: '50', want_pct: '30', invest_pct: '25' }),
    );
    expect(e).toMatch(/100%/);
  });

  it('rejects negative Must %', () => {
    const e = err(
      budgetSplit({ monthly_income: '10000', must_pct: '-10', want_pct: '60', invest_pct: '50' }),
    );
    expect(e).toMatch(/Must %/);
  });

  it('rejects Want % above 100', () => {
    const e = err(
      budgetSplit({ monthly_income: '10000', must_pct: '50', want_pct: '150', invest_pct: '20' }),
    );
    expect(e).toMatch(/Want %/);
  });
});

// ─── Emergency Fund ───────────────────────────────────────────────────────────

describe('emergencyFund', () => {
  it('normal case: no current savings', () => {
    const v = ok(
      emergencyFund({
        monthly_expenses: '5000',
        months_to_cover: '6',
        current_savings: '0',
      }),
    );
    expect(v.fund_target).toBe('30,000');
    // still need the full 30,000
    expect(v.remaining_needed).toBe('30,000');
  });

  it('partial savings reduces remaining amount', () => {
    const v = ok(
      emergencyFund({
        monthly_expenses: '5000',
        months_to_cover: '6',
        current_savings: '10000',
      }),
    );
    expect(v.fund_target).toBe('30,000');
    expect(v.remaining_needed).toBe('20,000');
  });

  it('fully covered — shows Covered message', () => {
    const v = ok(
      emergencyFund({
        monthly_expenses: '5000',
        months_to_cover: '6',
        current_savings: '30000',
      }),
    );
    expect(v.fund_target).toBe('30,000');
    expect(v.remaining_needed).toMatch(/[Cc]overed/);
  });

  it('over-funded — still covered', () => {
    const v = ok(
      emergencyFund({
        monthly_expenses: '2000',
        months_to_cover: '3',
        current_savings: '99999',
      }),
    );
    expect(v.remaining_needed).toMatch(/[Cc]overed/);
  });

  it('omitted months_to_cover defaults to 6', () => {
    const v = ok(
      emergencyFund({
        monthly_expenses: '2000',
        current_savings: '0',
      }),
    );
    // fund_target = 2000 × 6 = 12000
    expect(v.fund_target).toBe('12,000');
  });

  it('omitted current_savings defaults to 0', () => {
    const v = ok(
      emergencyFund({
        monthly_expenses: '1000',
        months_to_cover: '3',
      }),
    );
    expect(v.remaining_needed).toBe('3,000');
  });

  it('rejects missing monthly expenses', () => {
    const e = err(
      emergencyFund({ monthly_expenses: '', months_to_cover: '6', current_savings: '0' }),
    );
    expect(e).toMatch(/Monthly expenses/);
  });

  it('rejects zero monthly expenses', () => {
    const e = err(
      emergencyFund({ monthly_expenses: '0', months_to_cover: '6', current_savings: '0' }),
    );
    expect(e).toMatch(/Monthly expenses/);
  });

  it('rejects months_to_cover above 24', () => {
    const e = err(
      emergencyFund({ monthly_expenses: '5000', months_to_cover: '25', current_savings: '0' }),
    );
    expect(e).toMatch(/24/);
  });

  it('rejects negative current savings', () => {
    const e = err(
      emergencyFund({ monthly_expenses: '5000', months_to_cover: '6', current_savings: '-100' }),
    );
    expect(e).toMatch(/[Cc]urrent savings/);
  });
});

// ─── compute dispatch ─────────────────────────────────────────────────────────

describe('compute', () => {
  it('dispatches compound', () => {
    const r = compute('compound', {
      principal: '1000',
      annual_rate: '5',
      years: '1',
      monthly_deposit: '0',
    });
    expect(r.ok).toBe(true);
  });

  it('dispatches salary', () => {
    const r = compute('salary', { gross_monthly: '5000', tax_rate: '30' });
    expect(r.ok).toBe(true);
  });

  it('dispatches loan', () => {
    const r = compute('loan', { loan_amount: '100000', annual_rate: '5', term_years: '10' });
    expect(r.ok).toBe(true);
  });

  it('dispatches savings', () => {
    const r = compute('savings', {
      target: '10000',
      current_savings: '0',
      monthly_contribution: '500',
      annual_return: '0',
    });
    expect(r.ok).toBe(true);
  });

  it('dispatches budget', () => {
    const r = compute('budget', {
      monthly_income: '6000',
      must_pct: '50',
      want_pct: '30',
      invest_pct: '20',
    });
    expect(r.ok).toBe(true);
  });

  it('dispatches emergency', () => {
    const r = compute('emergency', {
      monthly_expenses: '3000',
      months_to_cover: '6',
      current_savings: '0',
    });
    expect(r.ok).toBe(true);
  });

  it('returns error for unknown id', () => {
    const r = compute('unknown', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Unknown/);
  });
});
