import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS_TARGET_VERSION } from '../db/migrations';

// ─── Versioning ───────────────────────────────────────────────────────────────

export const BACKUP_APP = 'BudgetBull' as const;
export const BACKUP_VERSION = 1;
/** Derived from migrations.ts — always in sync with the live schema version. */
export const BACKUP_SCHEMA_VERSION = MIGRATIONS_TARGET_VERSION;

// ─── Types ────────────────────────────────────────────────────────────────────

export type BackupRow = Record<string, unknown>;

export type BackupData = {
  months: BackupRow[];
  expenses: BackupRow[];
  investments: BackupRow[];
  investmentUpdates: BackupRow[];
  recurringExpenses: BackupRow[];
  recurringLogs: BackupRow[];
  settings: BackupRow | null;
  profile: BackupRow | null;
  avatar: BackupRow | null;
  achievements: BackupRow[];
  streak: BackupRow | null;
};

export type BackupFile = {
  app: typeof BACKUP_APP;
  backupVersion: number;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
};

export type RestorePreview = {
  exportedAt: string;
  schemaVersion: number;
  monthCount: number;
  expenseCount: number;
  investmentCount: number;
  recurringCount: number;
};

// ─── Validation (pure — no DB access) ────────────────────────────────────────

export function validateBackup(raw: unknown): BackupFile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Not a valid BudgetBull backup: file is not a JSON object.');
  }
  const obj = raw as Record<string, unknown>;

  if (obj.app !== BACKUP_APP) {
    throw new Error('Not a BudgetBull backup file.');
  }
  if (typeof obj.backupVersion !== 'number' || obj.backupVersion < 1) {
    throw new Error('Backup file is missing a valid backupVersion.');
  }
  if (obj.backupVersion > BACKUP_VERSION) {
    throw new Error(
      `This backup was made with a newer version of BudgetBull (format v${obj.backupVersion}). ` +
        `Update the app and try again.`,
    );
  }
  if (typeof obj.schemaVersion !== 'number') {
    throw new Error('Backup file is missing a schemaVersion.');
  }
  if (typeof obj.exportedAt !== 'string') {
    throw new Error('Backup file is missing exportedAt.');
  }
  if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
    throw new Error('Backup file is missing a valid data section.');
  }

  const data = obj.data as Record<string, unknown>;
  const requiredArrays: (keyof BackupData)[] = [
    'months',
    'expenses',
    'investments',
    'investmentUpdates',
    'recurringExpenses',
  ];
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Backup data is malformed: "${key}" must be an array.`);
    }
  }

  return raw as BackupFile;
}

/** Extract summary counts for the preview UI */
export function readRestorePreview(backup: BackupFile): RestorePreview {
  return {
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    monthCount: backup.data.months.length,
    expenseCount: backup.data.expenses.length,
    investmentCount: backup.data.investments.length,
    recurringCount: backup.data.recurringExpenses.length,
  };
}

// ─── Create backup ────────────────────────────────────────────────────────────

export async function createBackup(db: SQLiteDatabase): Promise<BackupFile> {
  const [
    months,
    expenses,
    investments,
    investmentUpdates,
    recurringExpenses,
    recurringLogs,
    settings,
    profile,
    avatar,
    achievements,
    streak,
  ] = await Promise.all([
    db.getAllAsync<BackupRow>('SELECT * FROM months ORDER BY month_key ASC'),
    db.getAllAsync<BackupRow>('SELECT * FROM expenses ORDER BY id ASC'),
    db.getAllAsync<BackupRow>('SELECT * FROM savings_items ORDER BY id ASC'),
    db.getAllAsync<BackupRow>('SELECT * FROM savings_updates ORDER BY id ASC'),
    db.getAllAsync<BackupRow>('SELECT * FROM recurring_expenses ORDER BY id ASC'),
    db.getAllAsync<BackupRow>('SELECT * FROM recurring_logs ORDER BY id ASC'),
    db.getFirstAsync<BackupRow>('SELECT * FROM app_settings WHERE id = 1'),
    db.getFirstAsync<BackupRow>('SELECT * FROM profile WHERE id = 1'),
    db.getFirstAsync<BackupRow>('SELECT * FROM avatar_config WHERE id = 1'),
    db.getAllAsync<BackupRow>('SELECT * FROM achievements'),
    db.getFirstAsync<BackupRow>('SELECT * FROM streak WHERE id = 1'),
  ]);

  return {
    app: BACKUP_APP,
    backupVersion: BACKUP_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      months: months ?? [],
      expenses: expenses ?? [],
      investments: investments ?? [],
      investmentUpdates: investmentUpdates ?? [],
      recurringExpenses: recurringExpenses ?? [],
      recurringLogs: recurringLogs ?? [],
      settings: settings ?? null,
      profile: profile ?? null,
      avatar: avatar ?? null,
      achievements: achievements ?? [],
      streak: streak ?? null,
    },
  };
}

/** Writes backup JSON to a cache file and opens the system share sheet */
export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');

  const backup = await createBackup(db);
  const json = JSON.stringify(backup, null, 2);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `budgetbull-backup-${date}.json`;
  const file = new File(Paths.cache, filename);
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: filename,
    UTI: 'public.json',
  });
}

// ─── Pick + parse backup file ─────────────────────────────────────────────────

/** Opens the document picker, reads the selected file, and validates it.
 *  Returns null if the user cancelled. Throws on any error. */
export async function pickAndValidateBackup(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.uri) throw new Error('Could not access the selected file.');

  let content: string;
  try {
    content = new File(asset.uri).textSync();
  } catch {
    throw new Error(
      'Could not read the backup file. Make sure you selected a BudgetBull backup (.json) saved in your Files app.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      'The selected file is not valid JSON. Make sure you chose a BudgetBull backup file.',
    );
  }

  return validateBackup(parsed);
}

// ─── FK consistency validation (pure — no DB access) ─────────────────────────

/** Verifies referential integrity within the backup data itself.
 *  Throws a descriptive error if any FK reference is broken. */
export function validateRestoreData(data: BackupData): void {
  const monthIds = new Set(data.months.map((r) => r.id));
  for (const e of data.expenses) {
    if (e.month_id != null && !monthIds.has(e.month_id)) {
      throw new Error(
        `Backup is inconsistent: expense (id ${e.id}) references month ${e.month_id} which does not exist in this backup.`,
      );
    }
  }

  const investmentIds = new Set(data.investments.map((r) => r.id));
  for (const u of data.investmentUpdates) {
    if (u.saving_item_id != null && !investmentIds.has(u.saving_item_id)) {
      throw new Error(
        `Backup is inconsistent: investment update (id ${u.id}) references investment ${u.saving_item_id} which does not exist.`,
      );
    }
  }

  const recurringIds = new Set(data.recurringExpenses.map((r) => r.id));
  const expenseIds = new Set(data.expenses.map((r) => r.id));
  for (const log of data.recurringLogs ?? []) {
    if (log.recurring_expense_id != null && !recurringIds.has(log.recurring_expense_id)) {
      throw new Error(
        `Backup is inconsistent: recurring log references recurring expense ${log.recurring_expense_id} which does not exist.`,
      );
    }
    if (log.expense_id != null && !expenseIds.has(log.expense_id)) {
      throw new Error(
        `Backup is inconsistent: recurring log references expense ${log.expense_id} which does not exist.`,
      );
    }
  }
}

// ─── Restore helpers ──────────────────────────────────────────────────────────

type BindVal = string | number | null;

/** All values coming from the backup were originally read from SQLite, so they
 *  are always string | number | null at runtime. This cast is safe. */
function b(v: unknown): BindVal {
  if (v === undefined) return null;
  return v as BindVal;
}

// ─── Restore ──────────────────────────────────────────────────────────────────

/** Replaces all local app data with the contents of `backup`.
 *  Runs inside a single transaction — rolls back entirely if anything fails. */
export async function restoreFromBackup(db: SQLiteDatabase, backup: BackupFile): Promise<void> {
  const { data } = backup;
  validateRestoreData(data);

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // 1. Clear existing data in FK-safe order
    await db.execAsync(`
      DELETE FROM recurring_logs;
      DELETE FROM savings_updates;
      DELETE FROM expenses;
      DELETE FROM months;
      DELETE FROM savings_items;
      DELETE FROM recurring_expenses;
      DELETE FROM achievements;
    `);

    // 2. Months
    for (const r of data.months) {
      await db.runAsync(
        `INSERT INTO months
           (id, month_key, status, income_cents,
            must_pct, want_pct, keep_pct,
            must_budget_cents, want_budget_cents, keep_budget_cents,
            want_rollover_cents, keep_rollover_cents, must_rollover_cents,
            must_spent_cents, want_spent_cents, invest_spent_cents,
            plan_score, plan_status, opened_at, closed_at, created_at, updated_at)
         VALUES (?,?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?, ?,?,?,?)`,
        [
          b(r.id),
          b(r.month_key),
          b(r.status),
          b(r.income_cents),
          b(r.must_pct),
          b(r.want_pct),
          b(r.keep_pct),
          b(r.must_budget_cents),
          b(r.want_budget_cents),
          b(r.keep_budget_cents),
          b(r.want_rollover_cents) ?? 0,
          b(r.keep_rollover_cents) ?? 0,
          b(r.must_rollover_cents) ?? 0,
          b(r.must_spent_cents) ?? 0,
          b(r.want_spent_cents) ?? 0,
          b(r.invest_spent_cents) ?? 0,
          b(r.plan_score) ?? null,
          b(r.plan_status) ?? null,
          b(r.opened_at),
          b(r.closed_at) ?? null,
          b(r.created_at),
          b(r.updated_at),
        ],
      );
    }

    // 3. Expenses
    for (const r of data.expenses) {
      await db.runAsync(
        `INSERT INTO expenses
           (id, month_id, title, amount_cents, spent_on, note,
            suggested_bucket, final_bucket, is_investment, is_recurring, category, created_at, updated_at)
         VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?)`,
        [
          b(r.id),
          b(r.month_id),
          b(r.title),
          b(r.amount_cents),
          b(r.spent_on),
          b(r.note) ?? null,
          b(r.suggested_bucket),
          b(r.final_bucket),
          b(r.is_investment) ?? 0,
          b(r.is_recurring) ?? 0,
          b(r.category) ?? null,
          b(r.created_at),
          b(r.updated_at),
        ],
      );
    }

    // 4. Investments (savings_items)
    for (const r of data.investments) {
      await db.runAsync(
        `INSERT INTO savings_items
           (id, name, category, asset_symbol, asset_coin_id, asset_quantity,
            opening_date, opening_amount_cents, current_value_cents, note, created_at, updated_at)
         VALUES (?,?,?,?,?,?, ?,?,?,?,?,?)`,
        [
          b(r.id),
          b(r.name),
          b(r.category),
          b(r.asset_symbol) ?? null,
          b(r.asset_coin_id) ?? null,
          b(r.asset_quantity) ?? null,
          b(r.opening_date),
          b(r.opening_amount_cents),
          b(r.current_value_cents),
          b(r.note) ?? null,
          b(r.created_at),
          b(r.updated_at),
        ],
      );
    }

    // 5. Investment updates (savings_updates)
    for (const r of data.investmentUpdates) {
      await db.runAsync(
        `INSERT INTO savings_updates
           (id, saving_item_id, effective_date, value_cents, type, amount_cents, note, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          b(r.id),
          b(r.saving_item_id),
          b(r.effective_date),
          b(r.value_cents),
          b(r.type) ?? 'value_update',
          b(r.amount_cents) ?? null,
          b(r.note) ?? null,
          b(r.created_at),
        ],
      );
    }

    // 6. Recurring expenses
    for (const r of data.recurringExpenses) {
      await db.runAsync(
        `INSERT INTO recurring_expenses
           (id, title, amount_cents, bucket, day_of_month, is_active, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          b(r.id),
          b(r.title),
          b(r.amount_cents),
          b(r.bucket),
          b(r.day_of_month),
          b(r.is_active) ?? 1,
          b(r.created_at),
          b(r.updated_at),
        ],
      );
    }

    // 7. Recurring logs (may be absent in older backups)
    for (const r of data.recurringLogs ?? []) {
      await db.runAsync(
        `INSERT INTO recurring_logs
           (id, recurring_expense_id, month_key, expense_id, created_at)
         VALUES (?,?,?,?,?)`,
        [b(r.id), b(r.recurring_expense_id), b(r.month_key), b(r.expense_id), b(r.created_at)],
      );
    }

    // 8. Settings (singleton row — always UPDATE)
    if (data.settings) {
      const s = data.settings;
      await db.runAsync(
        `UPDATE app_settings SET
           onboarding_completed   = ?,
           default_must_pct       = ?,
           default_want_pct       = ?,
           default_keep_pct       = ?,
           currency               = ?,
           must_rollover_target   = ?,
           want_rollover_target   = ?,
           invest_rollover_target = ?,
           updated_at             = ?
         WHERE id = 1`,
        [
          b(s.onboarding_completed) ?? 1,
          b(s.default_must_pct) ?? 50,
          b(s.default_want_pct) ?? 20,
          b(s.default_keep_pct) ?? 30,
          b(s.currency) ?? 'ILS',
          b(s.must_rollover_target) ?? 'invest',
          b(s.want_rollover_target) ?? 'want',
          b(s.invest_rollover_target) ?? 'invest',
          now,
        ],
      );
    }

    // 9. Profile (singleton row)
    if (data.profile) {
      const p = data.profile;
      await db.runAsync(
        `UPDATE profile SET name=?, email=?, age=?, birthday=?, occupation=?, updated_at=? WHERE id=1`,
        [
          b(p.name) ?? null,
          b(p.email) ?? null,
          b(p.age) ?? null,
          b(p.birthday) ?? null,
          b(p.occupation) ?? null,
          now,
        ],
      );
    }

    // 10. Achievements
    for (const r of data.achievements ?? []) {
      await db.runAsync(`INSERT OR REPLACE INTO achievements (id, unlocked_at) VALUES (?,?)`, [
        b(r.id),
        b(r.unlocked_at) ?? null,
      ]);
    }

    // 11. Streak (singleton row)
    if (data.streak) {
      const st = data.streak;
      const today = now.slice(0, 10);
      await db.runAsync(
        `UPDATE streak SET join_date=?, last_open_date=?, current_streak=?, longest_streak=? WHERE id=1`,
        [
          b(st.join_date) ?? today,
          b(st.last_open_date) ?? today,
          b(st.current_streak) ?? 1,
          b(st.longest_streak) ?? 1,
        ],
      );
    }

    // 12. Avatar (singleton row)
    if (data.avatar) {
      const av = data.avatar;
      await db.runAsync(
        `UPDATE avatar_config SET
           skin_tone=?, hair_style=?, hair_color=?, suit_color=?,
           hat=?, glasses=?, extra=?, eye_shape=?
         WHERE id=1`,
        [
          b(av.skin_tone) ?? 's2',
          b(av.hair_style) ?? 'clean',
          b(av.hair_color) ?? 'dkbrown',
          b(av.suit_color) ?? 'navy',
          b(av.hat) ?? 'none',
          b(av.glasses) ?? 'none',
          b(av.extra) ?? 'none',
          b(av.eye_shape) ?? 'default',
        ],
      );
    }
  });
}
