import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { BackButton } from '../components/ui/BackButton';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { compute } from '../lib/calculators';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type CalcField = {
  id: string;
  label: string;
  placeholder: string;
  keyboardType?: 'decimal-pad' | 'number-pad';
  defaultValue?: string;
};

type ResultRow = {
  id: string;
  label: string;
};

type CalcDef = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  fields: CalcField[];
  results: ResultRow[];
};

// ── Calculator definitions ────────────────────────────────────────────────────

const CALCULATORS: CalcDef[] = [
  {
    id: 'compound',
    icon: 'trending-up-outline',
    iconColor: colors.primary,
    iconBg: colors.surfaceSoft,
    title: 'Compound Interest',
    description: 'See how your investments grow over time.',
    fields: [
      {
        id: 'principal',
        label: 'Initial amount',
        placeholder: '10,000',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'annual_rate',
        label: 'Annual return (%)',
        placeholder: '7',
        keyboardType: 'decimal-pad',
      },
      { id: 'years', label: 'Duration (years)', placeholder: '10', keyboardType: 'number-pad' },
      {
        id: 'monthly_deposit',
        label: 'Monthly deposit',
        placeholder: '500',
        keyboardType: 'decimal-pad',
        defaultValue: '0',
      },
    ],
    results: [
      { id: 'final_value', label: 'Final value' },
      { id: 'total_contributed', label: 'Total contributed' },
      { id: 'interest_earned', label: 'Interest earned' },
    ],
  },
  {
    id: 'salary',
    icon: 'briefcase-outline',
    iconColor: colors.keep,
    iconBg: colors.keepSoft,
    title: 'Net Salary',
    description: 'Estimate take-home pay after tax.',
    fields: [
      {
        id: 'gross_monthly',
        label: 'Monthly gross salary',
        placeholder: '15,000',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'income_tax_rate',
        label: 'Income tax rate (%)',
        placeholder: '30',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'ni_rate',
        label: 'Social / NI rate (%)',
        placeholder: '12',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'other_deductions',
        label: 'Other deductions',
        placeholder: '0',
        keyboardType: 'decimal-pad',
        defaultValue: '0',
      },
    ],
    results: [
      { id: 'net_monthly', label: 'Net monthly pay' },
      { id: 'net_annual', label: 'Net annual' },
      { id: 'tax_monthly', label: 'Tax paid / month' },
    ],
  },
  {
    id: 'loan',
    icon: 'home-outline',
    iconColor: colors.must,
    iconBg: colors.mustSoft,
    title: 'Loan Payment',
    description: 'Plan monthly mortgage or loan repayments.',
    fields: [
      {
        id: 'loan_amount',
        label: 'Loan amount',
        placeholder: '500,000',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'annual_rate',
        label: 'Annual interest rate (%)',
        placeholder: '4.5',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'term_years',
        label: 'Loan term (years)',
        placeholder: '25',
        keyboardType: 'number-pad',
      },
    ],
    results: [
      { id: 'monthly_payment', label: 'Monthly payment' },
      { id: 'total_paid', label: 'Total paid' },
      { id: 'total_interest', label: 'Total interest' },
    ],
  },
  {
    id: 'savings',
    icon: 'flag-outline',
    iconColor: colors.primary,
    iconBg: colors.surfaceSoft,
    title: 'Savings Goal',
    description: 'Find out how long to reach your target.',
    fields: [
      { id: 'target', label: 'Target amount', placeholder: '100,000', keyboardType: 'decimal-pad' },
      {
        id: 'current_savings',
        label: 'Current savings',
        placeholder: '0',
        keyboardType: 'decimal-pad',
        defaultValue: '0',
      },
      {
        id: 'monthly_contribution',
        label: 'Monthly contribution',
        placeholder: '1,000',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'annual_return',
        label: 'Expected annual return (%)',
        placeholder: '5',
        keyboardType: 'decimal-pad',
        defaultValue: '0',
      },
    ],
    results: [
      { id: 'months_to_goal', label: 'Months to goal' },
      { id: 'total_contributed', label: 'Total contributed' },
      { id: 'interest_earned', label: 'Interest earned' },
    ],
  },
  {
    id: 'budget',
    icon: 'pie-chart-outline',
    iconColor: colors.keep,
    iconBg: colors.keepSoft,
    title: 'Budget Split',
    description: 'Split income into Must, Want, and Invest.',
    fields: [
      {
        id: 'monthly_income',
        label: 'Monthly net income',
        placeholder: '12,000',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'must_pct',
        label: 'Must (%)',
        placeholder: '50',
        keyboardType: 'number-pad',
        defaultValue: '50',
      },
      {
        id: 'want_pct',
        label: 'Want (%)',
        placeholder: '30',
        keyboardType: 'number-pad',
        defaultValue: '30',
      },
      {
        id: 'invest_pct',
        label: 'Invest (%)',
        placeholder: '20',
        keyboardType: 'number-pad',
        defaultValue: '20',
      },
    ],
    results: [
      { id: 'must_amount', label: 'Must budget' },
      { id: 'want_amount', label: 'Want budget' },
      { id: 'invest_amount', label: 'Invest budget' },
    ],
  },
  {
    id: 'emergency',
    icon: 'shield-checkmark-outline',
    iconColor: colors.want,
    iconBg: colors.wantSoft,
    title: 'Emergency Fund',
    description: 'Calculate your safety net target.',
    fields: [
      {
        id: 'monthly_expenses',
        label: 'Monthly expenses',
        placeholder: '5,000',
        keyboardType: 'decimal-pad',
      },
      {
        id: 'months_to_cover',
        label: 'Months to cover',
        placeholder: '6',
        keyboardType: 'number-pad',
        defaultValue: '6',
      },
      {
        id: 'monthly_saving',
        label: 'Monthly saving capacity',
        placeholder: '500',
        keyboardType: 'decimal-pad',
      },
    ],
    results: [
      { id: 'fund_target', label: 'Fund target' },
      { id: 'months_to_build', label: 'Months to build it' },
    ],
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CalculatorsScreen() {
  const router = useRouter();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const activeCalc = CALCULATORS.find((c) => c.id === activeId) ?? null;

  function openCalc(id: string) {
    const def = CALCULATORS.find((c) => c.id === id);
    if (!def) return;
    const defaults: Record<string, string> = {};
    def.fields.forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.id] = f.defaultValue;
    });
    setValues(defaults);
    setResult(null);
    setCalcError(null);
    setActiveId(id);
  }

  function closeCalc() {
    setActiveId(null);
    setValues({});
    setResult(null);
    setCalcError(null);
  }

  function handleCalculate() {
    if (!activeId) return;
    const r = compute(activeId, values);
    if (r.ok) {
      setResult(r.values);
      setCalcError(null);
    } else {
      setResult(null);
      setCalcError(r.error);
    }
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (activeCalc) {
    const canCalculate = activeCalc.fields
      .filter((f) => f.defaultValue === undefined)
      .every((f) => (values[f.id] ?? '').trim().length > 0);

    return (
      <AppScreen scroll>
        <View style={styles.topBar}>
          <BackButton onPress={closeCalc} />
        </View>

        <View style={styles.detailHeader}>
          <View style={[styles.detailIconWrap, { backgroundColor: activeCalc.iconBg }]}>
            <Ionicons name={activeCalc.icon} size={22} color={activeCalc.iconColor} />
          </View>
          <Text style={styles.detailTitle}>{activeCalc.title}</Text>
          <Text style={styles.detailDesc}>{activeCalc.description}</Text>
        </View>

        {/* Inputs */}
        <View style={styles.fieldsCard}>
          {activeCalc.fields.map((field, i) => (
            <Input
              key={field.id}
              label={field.label}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textTertiary}
              keyboardType={field.keyboardType ?? 'decimal-pad'}
              value={values[field.id] ?? ''}
              onChangeText={(t) => setValues((prev) => ({ ...prev, [field.id]: t }))}
              containerStyle={i > 0 ? { marginTop: spacing[4] } : undefined}
              returnKeyType="done"
            />
          ))}
        </View>

        <Button
          label="Calculate"
          onPress={handleCalculate}
          disabled={!canCalculate}
          style={styles.calcBtn}
        />

        {/* Result area */}
        <View style={styles.resultCard}>
          <Text style={styles.resultEyebrow}>Result</Text>

          {calcError ? (
            <Text style={styles.resultError}>{calcError}</Text>
          ) : (
            activeCalc.results.map((row, i) => (
              <View
                key={row.id}
                style={[
                  styles.resultRow,
                  i < activeCalc.results.length - 1 && styles.resultRowBorder,
                ]}
              >
                <Text style={styles.resultLabel}>{row.label}</Text>
                <Text style={[styles.resultValue, !result && styles.resultValueBlank]}>
                  {result?.[row.id] ?? '—'}
                </Text>
              </View>
            ))
          )}
        </View>

        {activeId === 'salary' && (
          <Text style={styles.disclaimer}>
            * This is a simplified estimate. Actual take-home pay depends on your country, tax
            bracket, employer, and other deductions.
          </Text>
        )}
      </AppScreen>
    );
  }

  // ── Grid view ────────────────────────────────────────────────────────────────
  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <BackButton
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Finance tools</Text>
        <Text style={styles.title}>Calculators</Text>
        <Text style={styles.subtitle}>
          Helpful tools to plan, optimize, and understand your finances.
        </Text>
      </View>

      <View style={styles.grid}>
        {CALCULATORS.map((calc) => (
          <Pressable
            key={calc.id}
            onPress={() => openCalc(calc.id)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={[styles.iconWrap, { backgroundColor: calc.iconBg }]}>
              <Ionicons name={calc.icon} size={20} color={calc.iconColor} />
            </View>
            <Text style={styles.cardTitle}>{calc.title}</Text>
            <Text style={styles.cardDesc}>{calc.description}</Text>
            <View style={styles.openRow}>
              <Text style={[styles.openText, { color: calc.iconColor }]}>Open</Text>
              <Ionicons name="chevron-forward" size={11} color={calc.iconColor} />
            </View>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[4],
  },

  // ── Grid header ───────────────────────────────────────────────────────────
  header: {
    marginBottom: spacing[6],
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing[1] + 2,
    letterSpacing: -0.1,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginBottom: spacing[3],
    flexGrow: 1,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Detail header ─────────────────────────────────────────────────────────
  detailHeader: {
    marginBottom: spacing[6],
  },
  detailIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  detailTitle: {
    fontSize: 30,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  detailDesc: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  fieldsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  calcBtn: {
    marginTop: spacing[5],
  },

  // ── Result card ───────────────────────────────────────────────────────────
  resultCard: {
    marginTop: spacing[5],
    marginBottom: spacing[6],
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  resultEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[4],
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  resultRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  resultValueBlank: {
    color: colors.border,
  },
  resultError: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.must,
    paddingVertical: spacing[2],
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
    marginTop: spacing[3],
    marginBottom: spacing[6],
    paddingHorizontal: spacing[1],
  },
});
