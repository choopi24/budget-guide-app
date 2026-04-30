import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useHomeDb, type HomeData } from '../db/home';
import { type RecurringExpense, useRecurringDb } from '../db/recurring';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { getMonthLabelFromKey } from '../lib/date';
import { hapticSuccess } from '../lib/haptics';
import {
  buildGradeExplanation,
  computeBudgetGrade,
  type BudgetGrade,
  type GradeExplanation,
} from '../lib/grade';
import { formatCentsToMoney } from '../lib/money';
import { colors } from '../theme/colors';

export type RowItem = {
  label: string;
  hint: string;
  used: number;
  planned: number;
  color: string;
  softColor: string;
};

export type HomeDerived = {
  paceRatio: number;
  rows: RowItem[];
  totalSpent: number;
  spendLeft: number;
  isOverBudget: boolean;
  currencySymbol: string;
  heroAmountText: string;
  daysLeft: number;
  pctUsed: number;
  paceLabel: string;
};

function getMonthPace(monthKey: string): number {
  const [y, mo] = monthKey.split('-').map(Number);
  const today = new Date();
  if (today.getFullYear() !== y || today.getMonth() + 1 !== mo) return 1;
  return today.getDate() / new Date(y, mo, 0).getDate();
}

function computeDerived(month: HomeData, currency: SupportedCurrency): HomeDerived {
  const paceRatio = getMonthPace(month.month_key);
  const rows: RowItem[] = [
    { label: 'Must', hint: 'Rent, groceries, bills', used: month.must_spent_cents, planned: month.must_budget_cents, color: colors.must, softColor: colors.mustSoft },
    { label: 'Want', hint: 'Food out, shopping, fun', used: month.want_spent_cents, planned: month.want_budget_cents, color: colors.want, softColor: colors.wantSoft },
    { label: 'Invest', hint: 'Savings and future goals', used: month.invest_spent_cents, planned: month.keep_budget_cents, color: colors.keep, softColor: colors.keepSoft },
  ];
  const totalSpent = month.must_spent_cents + month.want_spent_cents + month.invest_spent_cents;
  const spendLeft = month.income_cents - totalSpent;
  const isOverBudget = spendLeft < 0;
  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';
  const heroAmountText = Math.floor(Math.abs(spendLeft) / 100).toLocaleString('en-US');
  const [heroY, heroMo] = month.month_key.split('-').map(Number);
  const heroToday = new Date();
  const daysLeft =
    heroToday.getFullYear() === heroY && heroToday.getMonth() + 1 === heroMo
      ? Math.max(0, new Date(heroY, heroMo, 0).getDate() - heroToday.getDate())
      : 0;
  const pctUsed = month.income_cents > 0 ? Math.round((totalSpent / month.income_cents) * 100) : 0;
  const spendRatio = month.income_cents > 0 ? totalSpent / month.income_cents : 0;
  const paceLabel =
    spendRatio > paceRatio + 0.1
      ? 'OVER PACE'
      : spendRatio < paceRatio - 0.1
      ? 'UNDER PACE'
      : 'ON PACE';
  return { paceRatio, rows, totalSpent, spendLeft, isOverBudget, currencySymbol, heroAmountText, daysLeft, pctUsed, paceLabel };
}

export function useHomeData() {
  const { getActiveMonthHomeData } = useHomeDb();
  const { getCurrency } = useSettingsDb();
  const { getPendingForMonth, applyToActiveMonth } = useRecurringDb();

  const [month, setMonth]                           = useState<HomeData | null>(null);
  const [currency, setCurrency]                     = useState<SupportedCurrency>('ILS');
  const [grade, setGrade]                           = useState<BudgetGrade | null>(null);
  const [gradeExp, setGradeExp]                     = useState<GradeExplanation | null>(null);
  const [showGradeExp, setShowGradeExp]             = useState(false);
  const [pendingRecurring, setPendingRecurring]     = useState<RecurringExpense[]>([]);

  const load = useCallback(async () => {
    const [monthData, savedCurrency] = await Promise.all([
      getActiveMonthHomeData(),
      getCurrency(),
    ]);
    setMonth(monthData ?? null);
    setCurrency(savedCurrency);
    if (monthData) {
      const g = computeBudgetGrade(
        monthData.must_spent_cents,
        monthData.must_budget_cents,
        monthData.want_spent_cents,
        monthData.want_budget_cents,
        monthData.invest_spent_cents,
        monthData.keep_budget_cents,
      );
      setGrade(g);
      setGradeExp(
        buildGradeExplanation(
          g,
          monthData.must_spent_cents,
          monthData.must_budget_cents,
          monthData.want_spent_cents,
          monthData.want_budget_cents,
          monthData.invest_spent_cents,
          monthData.keep_budget_cents,
        ),
      );
      const pending = await getPendingForMonth(monthData.month_key);
      setPendingRecurring(pending);
    }
  }, [getActiveMonthHomeData, getCurrency, getPendingForMonth]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmApply(item: RecurringExpense) {
    if (!month) return;
    Alert.alert(
      `Add ${item.title}?`,
      `${formatCentsToMoney(item.amount_cents, currency)} will be logged to ${item.bucket === 'must' ? 'Must' : 'Want'} for ${getMonthLabelFromKey(month.month_key)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              await applyToActiveMonth(item);
              hapticSuccess();
              setPendingRecurring((prev) => prev.filter((r) => r.id !== item.id));
              load();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not add expense');
            }
          },
        },
      ],
    );
  }

  const derived = month ? computeDerived(month, currency) : null;

  return {
    month,
    currency,
    grade,
    gradeExp,
    showGradeExp,
    setShowGradeExp,
    pendingRecurring,
    load,
    derived,
    confirmApply,
  };
}
