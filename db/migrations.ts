import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );

  const currentVersion = result?.user_version ?? 0;
  const targetVersion = 14;

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
        must_rollover_target   TEXT NOT NULL DEFAULT 'invest',
        want_rollover_target   TEXT NOT NULL DEFAULT 'want',
        invest_rollover_target TEXT NOT NULL DEFAULT 'invest',
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
        want_rollover_cents  INTEGER NOT NULL DEFAULT 0,
        keep_rollover_cents  INTEGER NOT NULL DEFAULT 0,
        must_rollover_cents  INTEGER NOT NULL DEFAULT 0,
        must_spent_cents INTEGER NOT NULL DEFAULT 0,
        want_spent_cents INTEGER NOT NULL DEFAULT 0,
        invest_spent_cents INTEGER NOT NULL DEFAULT 0,
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
        is_investment INTEGER NOT NULL DEFAULT 0,
        is_recurring INTEGER NOT NULL DEFAULT 0,
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
        type TEXT NOT NULL DEFAULT 'value_update',
        amount_cents INTEGER,
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

      CREATE TABLE IF NOT EXISTS avatar_config (
        id         INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        skin_tone  TEXT NOT NULL DEFAULT 's2',
        hair_style TEXT NOT NULL DEFAULT 'clean',
        hair_color TEXT NOT NULL DEFAULT 'dkbrown',
        suit_color TEXT NOT NULL DEFAULT 'navy',
        hat        TEXT NOT NULL DEFAULT 'none',
        glasses    TEXT NOT NULL DEFAULT 'none',
        extra      TEXT NOT NULL DEFAULT 'none',
        eye_shape  TEXT NOT NULL DEFAULT 'default'
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY NOT NULL,
        unlocked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS streak (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        join_date TEXT NOT NULL,
        last_open_date TEXT NOT NULL,
        current_streak INTEGER NOT NULL DEFAULT 1,
        longest_streak INTEGER NOT NULL DEFAULT 1
      );

      INSERT OR IGNORE INTO avatar_config (id, skin_tone, hair_style, hair_color, suit_color, hat, glasses, extra, eye_shape)
        VALUES (1, 's2', 'clean', 'dkbrown', 'navy', 'none', 'none', 'none', 'default');
      INSERT OR IGNORE INTO streak (id, join_date, last_open_date, current_streak, longest_streak)
        VALUES (1, date('now'), date('now'), 1, 1);
    `);

    await db.execAsync(`PRAGMA user_version = 14`);
    return;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      ALTER TABLE app_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'ILS';
      ALTER TABLE savings_items ADD COLUMN asset_symbol TEXT;
      ALTER TABLE savings_items ADD COLUMN asset_quantity REAL;
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      ALTER TABLE app_settings ADD COLUMN must_rollover_target TEXT NOT NULL DEFAULT 'invest';
      ALTER TABLE app_settings ADD COLUMN want_rollover_target TEXT NOT NULL DEFAULT 'want';
      PRAGMA user_version = 6;
    `);
    return;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
      ALTER TABLE savings_items ADD COLUMN asset_symbol TEXT;
      ALTER TABLE savings_items ADD COLUMN asset_quantity REAL;
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      ALTER TABLE app_settings ADD COLUMN must_rollover_target TEXT NOT NULL DEFAULT 'invest';
      ALTER TABLE app_settings ADD COLUMN want_rollover_target TEXT NOT NULL DEFAULT 'want';
      PRAGMA user_version = 6;
    `);
    return;
  }

  if (currentVersion === 3) {
    await db.execAsync(`
      ALTER TABLE savings_items ADD COLUMN asset_quantity REAL;
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      ALTER TABLE app_settings ADD COLUMN must_rollover_target TEXT NOT NULL DEFAULT 'invest';
      ALTER TABLE app_settings ADD COLUMN want_rollover_target TEXT NOT NULL DEFAULT 'want';
      PRAGMA user_version = 6;
    `);
    return;
  }

  if (currentVersion === 4) {
    await db.execAsync(`
      ALTER TABLE savings_items ADD COLUMN asset_coin_id TEXT;
      ALTER TABLE app_settings ADD COLUMN must_rollover_target TEXT NOT NULL DEFAULT 'invest';
      ALTER TABLE app_settings ADD COLUMN want_rollover_target TEXT NOT NULL DEFAULT 'want';
      PRAGMA user_version = 6;
    `);
    return;
  }

  if (currentVersion === 5) {
    await db.execAsync(`
      ALTER TABLE app_settings ADD COLUMN must_rollover_target TEXT NOT NULL DEFAULT 'invest';
      ALTER TABLE app_settings ADD COLUMN want_rollover_target TEXT NOT NULL DEFAULT 'want';
      PRAGMA user_version = 6;
    `);
  }

  if (currentVersion === 6) {
    await db.execAsync(`
      ALTER TABLE months ADD COLUMN invest_spent_cents INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE expenses ADD COLUMN is_investment INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version = 7;
    `);
  }

  if (currentVersion === 7) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS avatar_config (
        id         INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        skin_tone  TEXT NOT NULL DEFAULT 's2',
        hair_style TEXT NOT NULL DEFAULT 'clean',
        hair_color TEXT NOT NULL DEFAULT 'dkbrown',
        hat        TEXT NOT NULL DEFAULT 'none',
        glasses    TEXT NOT NULL DEFAULT 'none',
        extra      TEXT NOT NULL DEFAULT 'none'
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY NOT NULL,
        unlocked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS streak (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        join_date TEXT NOT NULL,
        last_open_date TEXT NOT NULL,
        current_streak INTEGER NOT NULL DEFAULT 1,
        longest_streak INTEGER NOT NULL DEFAULT 1
      );

      INSERT OR IGNORE INTO avatar_config (id, skin_tone, hair_style, hair_color, hat, glasses, extra)
        VALUES (1, 's2', 'clean', 'dkbrown', 'none', 'none', 'none');
      INSERT OR IGNORE INTO streak (id, join_date, last_open_date, current_streak, longest_streak)
        VALUES (1, date('now'), date('now'), 1, 1);

      PRAGMA user_version = 8;
    `);
  }

  if (currentVersion === 8) {
    // Columns may already exist if the user went through the v7→v8 migration
    // (which created avatar_config with all 6 columns). Check before adding.
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(avatar_config)`);
    const colNames = new Set(cols.map((c) => c.name));

    if (!colNames.has('skin_tone')) {
      await db.execAsync(`ALTER TABLE avatar_config ADD COLUMN skin_tone TEXT NOT NULL DEFAULT 's2'`);
    }
    if (!colNames.has('hair_style')) {
      await db.execAsync(`ALTER TABLE avatar_config ADD COLUMN hair_style TEXT NOT NULL DEFAULT 'clean'`);
    }
    if (!colNames.has('hair_color')) {
      await db.execAsync(`ALTER TABLE avatar_config ADD COLUMN hair_color TEXT NOT NULL DEFAULT 'dkbrown'`);
    }

    await db.execAsync(`PRAGMA user_version = 9`);
  }

  if (currentVersion === 9) {
    await db.execAsync(`
      ALTER TABLE expenses ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version = 10;
    `);
  }

  if (currentVersion === 10) {
    await db.execAsync(`
      ALTER TABLE avatar_config ADD COLUMN suit_color TEXT NOT NULL DEFAULT 'navy';
      PRAGMA user_version = 11;
    `);
  }

  if (currentVersion === 11) {
    await db.execAsync(`
      ALTER TABLE avatar_config ADD COLUMN eye_shape TEXT NOT NULL DEFAULT 'default';
      PRAGMA user_version = 12;
    `);
  }

  if (currentVersion === 12) {
    await db.execAsync(`
      ALTER TABLE app_settings ADD COLUMN invest_rollover_target TEXT NOT NULL DEFAULT 'invest';
      ALTER TABLE months ADD COLUMN must_rollover_cents INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version = 13;
    `);
  }

  if (currentVersion === 13) {
    await db.execAsync(`
      ALTER TABLE savings_updates ADD COLUMN type TEXT NOT NULL DEFAULT 'value_update';
      ALTER TABLE savings_updates ADD COLUMN amount_cents INTEGER;
      PRAGMA user_version = 14;
    `);
  }
}