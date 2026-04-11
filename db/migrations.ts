import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );

  const currentVersion = result?.user_version ?? 0;
  const targetVersion = 5;

  if (currentVersion >= targetVersion) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        default_must_pct REAL NOT NULL DEFAULT 50,
        default_want_pct REAL NOT NULL DEFAULT 20,
        default_keep_pct REAL NOT NULL DEFAULT 30,
        currency TEXT NOT NULL DEFAULT 'ILS',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        name TEXT,
        email TEXT,
        age INTEGER,
        birthday TEXT,
        occupation TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS months (
        id INTEGER PRIMARY KEY NOT NULL,
        month_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        income_cents INTEGER NOT NULL,
        must_pct REAL NOT NULL,
        want_pct REAL NOT NULL,
        keep_pct REAL NOT NULL,
        must_budget_cents INTEGER NOT NULL,
        want_budget_cents INTEGER NOT NULL,
        keep_budget_cents INTEGER NOT NULL,
        want_rollover_cents INTEGER NOT NULL DEFAULT 0,
        keep_rollover_cents INTEGER NOT NULL DEFAULT 0,
        must_spent_cents INTEGER NOT NULL DEFAULT 0,
        want_spent_cents INTEGER NOT NULL DEFAULT 0,
        plan_score INTEGER,
        plan_status TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY NOT NULL,
        month_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        spent_on TEXT NOT NULL,
        note TEXT,
        suggested_bucket TEXT NOT NULL CHECK (suggested_bucket IN ('must', 'want')),
        final_bucket TEXT NOT NULL CHECK (final_bucket IN ('must', 'want')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS savings_items (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        asset_symbol TEXT,
        asset_coin_id TEXT,
        asset_quantity REAL,
        opening_date TEXT NOT NULL,
        opening_amount_cents INTEGER NOT NULL,
        current_value_cents INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS savings_updates (
        id INTEGER PRIMARY KEY NOT NULL,
        saving_item_id INTEGER NOT NULL,
        effective_date TEXT NOT NULL,
        value_cents INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (saving_item_id) REFERENCES savings_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_months_month_key
        ON months(month_key);

      CREATE INDEX IF NOT EXISTS idx_expenses_month_id
        ON expenses(month_id);

      CREATE INDEX IF NOT EXISTS idx_expenses_spent_on
        ON expenses(spent_on);

      CREATE INDEX IF NOT EXISTS idx_savings_updates_item_id
        ON savings_updates(saving_item_id);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_updates_item_date
        ON savings_updates(saving_item_id, effective_date);

      INSERT OR IGNORE INTO app_settings (
        id,
        onboarding_completed,
        default_must_pct,
        default_want_pct,
        default_keep_pct,
        currency,
        created_at,
        updated_at
      )
      VALUES (
        1,
        0,
        50,
        20,
        30,
        'ILS',
        datetime('now'),
        datetime('now')
      );

      INSERT OR IGNORE INTO profile (
        id,
        created_at,
        updated_at
      )
      VALUES (
        1,
        datetime('now'),
        datetime('now')
      );
    `);

    await db.execAsync(`PRAGMA user_version = 5`);
    return;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      ALTER TABLE app_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'ILS';
      ALTER TABLE savings_items ADD COLUMN asset_symbol TEXT;
      ALTER TABLE savings_items ADD COLUMN asset_quantity REAL;
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      PRAGMA user_version = 5;
    `);
    return;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
      ALTER TABLE savings_items ADD COLUMN asset_symbol TEXT;
      ALTER TABLE savings_items ADD COLUMN asset_quantity REAL;
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      PRAGMA user_version = 5;
    `);
    return;
  }

  if (currentVersion === 3) {
    await db.execAsync(`
      ALTER TABLE savings_items ADD COLUMN asset_quantity REAL;
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      PRAGMA user_version = 5;
    `);
    return;
  }

  if (currentVersion === 4) {
    await db.execAsync(`
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      PRAGMA user_version = 5;
    `);
  }
}