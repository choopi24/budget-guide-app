import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { computeBudgetGrade, applyConsecutiveBonus, type BudgetGrade } from '../lib/grade';

export type ProfileData = {
  name: string | null;
  occupation: string | null;
  email: string | null;
};

export type MonthScoreRow = {
  month_key: string;
  must_budget_cents: number;
  must_spent_cents: number;
  want_budget_cents: number;
  want_spent_cents: number;
  income_cents: number;
  grade: BudgetGrade;
};

export type League = 'Apex' | 'Gold' | 'Silver' | 'Bronze' | 'Iron';

export const GRADE_SCORE: Record<BudgetGrade, number> = {
  S: 100,
  'A+': 92,
  A: 80,
  B: 65,
  C: 45,
  D: 25,
  F: 5,
};

export function getLeague(avgScore: number): League {
  if (avgScore >= 90) return 'Apex';
  if (avgScore >= 75) return 'Gold';
  if (avgScore >= 58) return 'Silver';
  if (avgScore >= 38) return 'Bronze';
  return 'Iron';
}

export const LEAGUE_META: Record<
  League,
  { color: string; accent: string; icon: string; description: string }
> = {
  Apex: {
    color: '#4C79B5',
    accent: '#D6E4F7',
    icon: '◆',
    description: 'Elite discipline — consistently under budget',
  },
  Gold: {
    color: '#C9A227',
    accent: '#FBF3D5',
    icon: '●',
    description: 'Excellent control with strong results',
  },
  Silver: {
    color: '#6B8FAB',
    accent: '#DDE9F3',
    icon: '●',
    description: 'Solid budgeting with room to grow',
  },
  Bronze: {
    color: '#B87340',
    accent: '#F5E6D4',
    icon: '●',
    description: 'Building better habits month by month',
  },
  Iron: {
    color: '#8A8E8C',
    accent: '#E8EBEA',
    icon: '●',
    description: 'Every month is a fresh opportunity',
  },
};

export function getNextLeagueThreshold(league: League): number | null {
  if (league === 'Iron') return 38;
  if (league === 'Bronze') return 58;
  if (league === 'Silver') return 75;
  if (league === 'Gold') return 90;
  return null; // Apex — top
}

export function useProfileDb() {
  const db = useSQLiteContext();

  const getProfile = useCallback(async function getProfile(): Promise<ProfileData> {
    const result = await db.getFirstAsync<{
      name: string | null;
      occupation: string | null;
      email: string | null;
    }>(`SELECT name, occupation, email FROM profile WHERE id = 1`);
    return result ?? { name: null, occupation: null, email: null };
  }, [db]);

  const getMonthScores = useCallback(async function getMonthScores(): Promise<MonthScoreRow[]> {
    const rows = await db.getAllAsync<{
      month_key: string;
      must_budget_cents: number;
      must_spent_cents: number;
      want_budget_cents: number;
      want_spent_cents: number;
      income_cents: number;
    }>(`
      SELECT
        month_key,
        must_budget_cents,
        must_spent_cents,
        want_budget_cents,
        want_spent_cents,
        income_cents
      FROM months
      ORDER BY id ASC
    `);

    const ascRows = rows ?? [];

    // Compute base grades oldest→newest, then apply S bonus for consecutive A+
    const baseGrades = ascRows.map((row) =>
      computeBudgetGrade(row.must_spent_cents, row.must_budget_cents, row.want_spent_cents, row.want_budget_cents)
    );
    const finalGrades = applyConsecutiveBonus(baseGrades);

    // Return newest-first for display
    return ascRows
      .map((row, i) => ({ ...row, grade: finalGrades[i] }))
      .reverse();
  }, [db]);

  return { getProfile, getMonthScores };
}
