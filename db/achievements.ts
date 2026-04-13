import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type Achievement = AchievementDef & {
  unlockedAt: string | null;
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  joinDate: string;
  lastOpenDate: string;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'early_adopter',
    title: 'Early Adopter',
    description: 'Welcome to the herd.',
    icon: '🐂',
  },
  {
    id: 'first_expense',
    title: 'First Spend',
    description: 'Log your first expense.',
    icon: '📝',
  },
  {
    id: 'first_investment',
    title: 'First Investment',
    description: 'Record your first investment.',
    icon: '📈',
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: '3-day opening streak.',
    icon: '🔥',
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: '7-day opening streak.',
    icon: '⚡',
  },
  {
    id: 'streak_30',
    title: 'Month Master',
    description: '30-day opening streak.',
    icon: '🏆',
  },
  {
    id: 'grade_s',
    title: 'Perfect Month',
    description: 'Earn an S grade for a month.',
    icon: '⭐',
  },
  {
    id: 'grade_a',
    title: 'Sharp Budget',
    description: 'Earn an A or A+ grade.',
    icon: '💎',
  },
  {
    id: 'first_month',
    title: 'Month One',
    description: 'Complete your first tracked month.',
    icon: '📅',
  },
  {
    id: 'five_months',
    title: 'Committed',
    description: 'Track 5 months in a row.',
    icon: '💪',
  },
];

export function useAchievementsDb() {
  const db = useSQLiteContext();

  const getStreak = useCallback(async (): Promise<StreakData | null> => {
    const row = await db.getFirstAsync<{
      join_date: string;
      last_open_date: string;
      current_streak: number;
      longest_streak: number;
    }>(`SELECT join_date, last_open_date, current_streak, longest_streak FROM streak WHERE id = 1`);

    if (!row) return null;
    return {
      joinDate: row.join_date,
      lastOpenDate: row.last_open_date,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
    };
  }, [db]);

  const touchStreak = useCallback(async (): Promise<StreakData> => {
    const today = new Date().toISOString().slice(0, 10);

    const existing = await db.getFirstAsync<{
      join_date: string;
      last_open_date: string;
      current_streak: number;
      longest_streak: number;
    }>(`SELECT join_date, last_open_date, current_streak, longest_streak FROM streak WHERE id = 1`);

    if (!existing) {
      await db.runAsync(
        `INSERT INTO streak (id, join_date, last_open_date, current_streak, longest_streak)
         VALUES (1, ?, ?, 1, 1)`,
        today, today
      );
      return { joinDate: today, lastOpenDate: today, currentStreak: 1, longestStreak: 1 };
    }

    if (existing.last_open_date === today) {
      return {
        joinDate: existing.join_date,
        lastOpenDate: existing.last_open_date,
        currentStreak: existing.current_streak,
        longestStreak: existing.longest_streak,
      };
    }

    const last = new Date(existing.last_open_date);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak: number;
    if (diffDays === 1) {
      newStreak = existing.current_streak + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, existing.longest_streak);

    await db.runAsync(
      `UPDATE streak SET last_open_date = ?, current_streak = ?, longest_streak = ? WHERE id = 1`,
      today, newStreak, newLongest
    );

    return {
      joinDate: existing.join_date,
      lastOpenDate: today,
      currentStreak: newStreak,
      longestStreak: newLongest,
    };
  }, [db]);

  const getAchievements = useCallback(async (): Promise<Achievement[]> => {
    const rows = await db.getAllAsync<{ id: string; unlocked_at: string | null }>(
      `SELECT id, unlocked_at FROM achievements`
    );

    const unlockedMap = new Map<string, string | null>();
    for (const r of rows ?? []) {
      unlockedMap.set(r.id, r.unlocked_at);
    }

    return ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      unlockedAt: unlockedMap.get(def.id) ?? null,
    }));
  }, [db]);

  const unlockAchievement = useCallback(async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, ?)`,
      id, now
    );
  }, [db]);

  const checkAndUnlockAchievements = useCallback(async (currentStreak: number): Promise<void> => {
    const now = new Date().toISOString();

    const expenseCount = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM expenses`);
    const investCount = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM savings_items`);
    const monthCount = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM months`);
    const sGradeMonths = await db.getAllAsync<{ plan_score: number | null }>(`SELECT plan_score FROM months`);

    const toUnlock: string[] = ['early_adopter'];

    if ((expenseCount?.c ?? 0) > 0) toUnlock.push('first_expense');
    if ((investCount?.c ?? 0) > 0) toUnlock.push('first_investment');
    if (currentStreak >= 3) toUnlock.push('streak_3');
    if (currentStreak >= 7) toUnlock.push('streak_7');
    if (currentStreak >= 30) toUnlock.push('streak_30');
    if ((monthCount?.c ?? 0) >= 1) toUnlock.push('first_month');
    if ((monthCount?.c ?? 0) >= 5) toUnlock.push('five_months');

    await Promise.all(
      toUnlock.map((id) =>
        db.runAsync(
          `INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, ?)`,
          id, now
        )
      )
    );
  }, [db]);

  return { getStreak, touchStreak, getAchievements, unlockAchievement, checkAndUnlockAchievements };
}
