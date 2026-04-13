import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export type SupportedCurrency = 'ILS' | 'USD' | 'EUR';

export type RolloverTarget = 'invest' | 'discard';
export type WantRolloverTarget = 'want' | 'discard';

export type RolloverSettings = {
  mustRolloverTarget: RolloverTarget;
  wantRolloverTarget: WantRolloverTarget;
};

export type AppBootState = {
  onboardingCompleted: boolean;
  hasActiveMonth: boolean;
};

export type SaveOnboardingInput = {
  name?: string;
  email?: string;
  age?: number | null;
  birthday?: string | null;
  occupation?: string;
  mustPct: number;
  wantPct: number;
  keepPct: number;
};

export function useSettingsDb() {
  const db = useSQLiteContext();

  const getBootState = useCallback(async function getBootState(): Promise<AppBootState> {
    const settings = await db.getFirstAsync<{
      onboarding_completed: number;
    }>(`SELECT onboarding_completed FROM app_settings WHERE id = 1`);

    const activeMonth = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM months WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    );

    return {
      onboardingCompleted: Boolean(settings?.onboarding_completed),
      hasActiveMonth: Boolean(activeMonth?.id),
    };
  }, [db]);

  const getCurrency = useCallback(async function getCurrency(): Promise<SupportedCurrency> {
    const result = await db.getFirstAsync<{ currency: SupportedCurrency }>(
      `SELECT currency FROM app_settings WHERE id = 1`
    );

    return result?.currency ?? 'ILS';
  }, [db]);

  const updateCurrency = useCallback(async function updateCurrency(currency: SupportedCurrency) {
    await db.runAsync(
      `
      UPDATE app_settings
      SET
        currency = ?,
        updated_at = ?
      WHERE id = 1
      `,
      [currency, new Date().toISOString()]
    );
  }, [db]);

  const saveOnboarding = useCallback(async function saveOnboarding(input: SaveOnboardingInput) {
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE profile
        SET
          name = ?,
          email = ?,
          age = ?,
          birthday = ?,
          occupation = ?,
          updated_at = ?
        WHERE id = 1
        `,
        [
          input.name?.trim() || null,
          input.email?.trim() || null,
          input.age ?? null,
          input.birthday ?? null,
          input.occupation?.trim() || null,
          now,
        ]
      );

      await db.runAsync(
        `
        UPDATE app_settings
        SET
          onboarding_completed = 1,
          default_must_pct = ?,
          default_want_pct = ?,
          default_keep_pct = ?,
          updated_at = ?
        WHERE id = 1
        `,
        [
          input.mustPct,
          input.wantPct,
          input.keepPct,
          now,
        ]
      );
    });
  }, [db]);

  const getRolloverSettings = useCallback(async function getRolloverSettings(): Promise<RolloverSettings> {
    const result = await db.getFirstAsync<{
      must_rollover_target: string;
      want_rollover_target: string;
    }>(`SELECT must_rollover_target, want_rollover_target FROM app_settings WHERE id = 1`);
    return {
      mustRolloverTarget: (result?.must_rollover_target ?? 'invest') as RolloverTarget,
      wantRolloverTarget: (result?.want_rollover_target ?? 'want') as WantRolloverTarget,
    };
  }, [db]);

  const updateRolloverSettings = useCallback(async function updateRolloverSettings(input: Partial<RolloverSettings>) {
    const now = new Date().toISOString();
    if (input.mustRolloverTarget !== undefined) {
      await db.runAsync(`UPDATE app_settings SET must_rollover_target = ?, updated_at = ? WHERE id = 1`, [input.mustRolloverTarget, now]);
    }
    if (input.wantRolloverTarget !== undefined) {
      await db.runAsync(`UPDATE app_settings SET want_rollover_target = ?, updated_at = ? WHERE id = 1`, [input.wantRolloverTarget, now]);
    }
  }, [db]);

  return {
    getBootState,
    getCurrency,
    updateCurrency,
    saveOnboarding,
    getRolloverSettings,
    updateRolloverSettings,
  };
}