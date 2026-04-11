import { useSQLiteContext } from 'expo-sqlite';

export type SupportedCurrency = 'ILS' | 'USD' | 'EUR';

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

  async function getBootState(): Promise<AppBootState> {
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
  }

  async function getCurrency(): Promise<SupportedCurrency> {
    const result = await db.getFirstAsync<{ currency: SupportedCurrency }>(
      `SELECT currency FROM app_settings WHERE id = 1`
    );

    return result?.currency ?? 'ILS';
  }

  async function updateCurrency(currency: SupportedCurrency) {
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
  }

  async function saveOnboarding(input: SaveOnboardingInput) {
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
  }

  return {
    getBootState,
    getCurrency,
    updateCurrency,
    saveOnboarding,
  };
}