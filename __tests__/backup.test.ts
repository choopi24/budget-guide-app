import {
  validateBackup,
  validateRestoreData,
  readRestorePreview,
  BACKUP_APP,
  BACKUP_VERSION,
  BACKUP_SCHEMA_VERSION,
  type BackupFile,
  type BackupData,
} from '../lib/backup';
import { MIGRATIONS_TARGET_VERSION } from '../db/migrations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minimalBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    app: BACKUP_APP,
    backupVersion: BACKUP_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: '2024-06-01T10:00:00.000Z',
    data: {
      months: [],
      expenses: [],
      investments: [],
      investmentUpdates: [],
      recurringExpenses: [],
      recurringLogs: [],
      settings: null,
      profile: null,
      avatar: null,
      achievements: [],
      streak: null,
    },
    ...overrides,
  };
}

function backupWithData(): BackupFile {
  return minimalBackup({
    data: {
      months: [
        { id: 1, month_key: '2024-01' },
        { id: 2, month_key: '2024-02' },
      ],
      expenses: [{ id: 1 }, { id: 2 }, { id: 3 }],
      investments: [{ id: 1 }],
      investmentUpdates: [{ id: 1 }, { id: 2 }],
      recurringExpenses: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      recurringLogs: [],
      settings: { currency: 'USD' },
      profile: { name: 'Test User' },
      avatar: null,
      achievements: [],
      streak: null,
    },
  });
}

// ─── Schema version sync ──────────────────────────────────────────────────────

describe('schema version constants', () => {
  it('BACKUP_SCHEMA_VERSION equals MIGRATIONS_TARGET_VERSION', () => {
    // This test catches the case where someone bumps migrations.ts targetVersion
    // but forgets to update backup.ts (or vice versa). If they diverge, every
    // backup written by this build declares the wrong schema version.
    expect(BACKUP_SCHEMA_VERSION).toBe(MIGRATIONS_TARGET_VERSION);
  });

  it('BACKUP_VERSION is a positive integer', () => {
    expect(Number.isInteger(BACKUP_VERSION)).toBe(true);
    expect(BACKUP_VERSION).toBeGreaterThan(0);
  });

  it('BACKUP_APP is the string "BudgetBull"', () => {
    expect(BACKUP_APP).toBe('BudgetBull');
  });
});

// ─── validateBackup ───────────────────────────────────────────────────────────

describe('validateBackup', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it('accepts a minimal valid backup', () => {
    const b = minimalBackup();
    expect(() => validateBackup(b)).not.toThrow();
    expect(validateBackup(b)).toEqual(b);
  });

  it('accepts a backup with data', () => {
    const b = backupWithData();
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts backups with schemaVersion different from current (older backups are restorable)', () => {
    const b = minimalBackup({ schemaVersion: 10 });
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts schemaVersion = 0 (extremely old backup — no minimum enforced)', () => {
    const b = minimalBackup({ schemaVersion: 0 });
    expect(() => validateBackup(b)).not.toThrow();
  });

  // ── Newer backupVersion ────────────────────────────────────────────────────

  it('rejects backups with a higher backupVersion than current (newer app required)', () => {
    const b = minimalBackup({ backupVersion: BACKUP_VERSION + 1 });
    expect(() => validateBackup(b)).toThrow('newer version');
  });

  // ── Null / primitive inputs ────────────────────────────────────────────────

  it('rejects null', () => {
    expect(() => validateBackup(null)).toThrow('not a JSON object');
  });

  it('rejects undefined', () => {
    expect(() => validateBackup(undefined)).toThrow('not a JSON object');
  });

  it('rejects a plain string', () => {
    expect(() => validateBackup('hello')).toThrow('not a JSON object');
  });

  it('rejects a number', () => {
    expect(() => validateBackup(42)).toThrow('not a JSON object');
  });

  it('rejects an array (top-level)', () => {
    expect(() => validateBackup([])).toThrow('not a JSON object');
  });

  it('rejects a boolean', () => {
    expect(() => validateBackup(true)).toThrow('not a JSON object');
  });

  // ── Wrong app name ─────────────────────────────────────────────────────────

  it('rejects a wrong app name', () => {
    const b = { ...minimalBackup(), app: 'OtherApp' };
    expect(() => validateBackup(b)).toThrow('Not a BudgetBull backup');
  });

  it('rejects app = null', () => {
    const b = { ...minimalBackup(), app: null };
    expect(() => validateBackup(b)).toThrow('Not a BudgetBull backup');
  });

  // ── backupVersion ──────────────────────────────────────────────────────────

  it('rejects missing backupVersion', () => {
    const { backupVersion: _bv, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('backupVersion');
  });

  it('rejects backupVersion = 0', () => {
    const b = { ...minimalBackup(), backupVersion: 0 };
    expect(() => validateBackup(b)).toThrow('backupVersion');
  });

  it('rejects negative backupVersion', () => {
    const b = { ...minimalBackup(), backupVersion: -1 };
    expect(() => validateBackup(b)).toThrow('backupVersion');
  });

  it('rejects backupVersion as a string', () => {
    const b = { ...minimalBackup(), backupVersion: '1' };
    expect(() => validateBackup(b)).toThrow('backupVersion');
  });

  // ── schemaVersion ──────────────────────────────────────────────────────────

  it('rejects missing schemaVersion', () => {
    const { schemaVersion: _sv, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('schemaVersion');
  });

  it('rejects schemaVersion as a string', () => {
    const b = { ...minimalBackup(), schemaVersion: '17' };
    expect(() => validateBackup(b)).toThrow('schemaVersion');
  });

  it('rejects schemaVersion as null', () => {
    const b = { ...minimalBackup(), schemaVersion: null };
    expect(() => validateBackup(b)).toThrow('schemaVersion');
  });

  // ── exportedAt ────────────────────────────────────────────────────────────

  it('rejects missing exportedAt', () => {
    const { exportedAt: _ea, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('exportedAt');
  });

  it('rejects exportedAt as a number', () => {
    const b = { ...minimalBackup(), exportedAt: 1234567890 };
    expect(() => validateBackup(b)).toThrow('exportedAt');
  });

  it('rejects exportedAt as null', () => {
    const b = { ...minimalBackup(), exportedAt: null };
    expect(() => validateBackup(b)).toThrow('exportedAt');
  });

  // ── data section ──────────────────────────────────────────────────────────

  it('rejects missing data', () => {
    const { data: _d, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('data');
  });

  it('rejects data that is an array (not an object)', () => {
    const b = { ...minimalBackup(), data: [] };
    expect(() => validateBackup(b)).toThrow('data');
  });

  it('rejects data = null', () => {
    const b = { ...minimalBackup(), data: null };
    expect(() => validateBackup(b)).toThrow('data');
  });

  it('rejects data = "string"', () => {
    const b = { ...minimalBackup(), data: 'not-an-object' };
    expect(() => validateBackup(b)).toThrow('data');
  });

  // ── required array fields ─────────────────────────────────────────────────

  it('rejects months that is not an array', () => {
    const b = { ...minimalBackup(), data: { ...minimalBackup().data, months: null } };
    expect(() => validateBackup(b)).toThrow('months');
  });

  it('rejects expenses that is not an array', () => {
    const b = { ...minimalBackup(), data: { ...minimalBackup().data, expenses: 'bad' } };
    expect(() => validateBackup(b)).toThrow('expenses');
  });

  it('rejects investments that is not an array', () => {
    const b = { ...minimalBackup(), data: { ...minimalBackup().data, investments: {} } };
    expect(() => validateBackup(b)).toThrow('investments');
  });

  it('rejects investmentUpdates that is not an array', () => {
    const b = { ...minimalBackup(), data: { ...minimalBackup().data, investmentUpdates: 0 } };
    expect(() => validateBackup(b)).toThrow('investmentUpdates');
  });

  it('rejects recurringExpenses that is not an array', () => {
    const b = { ...minimalBackup(), data: { ...minimalBackup().data, recurringExpenses: true } };
    expect(() => validateBackup(b)).toThrow('recurringExpenses');
  });

  // ── optional / nullable fields are accepted ───────────────────────────────

  it('accepts recurringLogs = undefined (older backups without this field)', () => {
    const b = minimalBackup();
    const withoutLogs = {
      ...b,
      data: { ...b.data, recurringLogs: undefined as unknown as BackupData['recurringLogs'] },
    };
    expect(() => validateBackup(withoutLogs)).not.toThrow();
  });

  it('accepts settings = null', () => {
    const b = minimalBackup({ data: { ...minimalBackup().data, settings: null } });
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts profile = null', () => {
    const b = minimalBackup({ data: { ...minimalBackup().data, profile: null } });
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts avatar = null', () => {
    const b = minimalBackup({ data: { ...minimalBackup().data, avatar: null } });
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts streak = null', () => {
    const b = minimalBackup({ data: { ...minimalBackup().data, streak: null } });
    expect(() => validateBackup(b)).not.toThrow();
  });
});

// ─── readRestorePreview ───────────────────────────────────────────────────────

describe('readRestorePreview', () => {
  it('returns zero counts for empty backup', () => {
    const preview = readRestorePreview(minimalBackup());
    expect(preview.monthCount).toBe(0);
    expect(preview.expenseCount).toBe(0);
    expect(preview.investmentCount).toBe(0);
    expect(preview.recurringCount).toBe(0);
  });

  it('returns correct counts from backup with data', () => {
    const preview = readRestorePreview(backupWithData());
    expect(preview.monthCount).toBe(2);
    expect(preview.expenseCount).toBe(3);
    expect(preview.investmentCount).toBe(1);
    expect(preview.recurringCount).toBe(4);
  });

  it('returns exportedAt from backup', () => {
    const b = minimalBackup({ exportedAt: '2025-01-15T08:30:00.000Z' });
    const preview = readRestorePreview(b);
    expect(preview.exportedAt).toBe('2025-01-15T08:30:00.000Z');
  });

  it('returns schemaVersion from backup', () => {
    const b = minimalBackup({ schemaVersion: 12 });
    const preview = readRestorePreview(b);
    expect(preview.schemaVersion).toBe(12);
  });

  it('investmentCount reflects savings_items (investments array), not investmentUpdates', () => {
    const b = minimalBackup({
      data: {
        ...minimalBackup().data,
        investments: [{ id: 1 }, { id: 2 }],
        investmentUpdates: [{ id: 10 }, { id: 11 }, { id: 12 }],
      },
    });
    const preview = readRestorePreview(b);
    expect(preview.investmentCount).toBe(2);
  });
});

// ─── validateRestoreData ──────────────────────────────────────────────────────

function emptyData(): BackupData {
  return {
    months: [],
    expenses: [],
    investments: [],
    investmentUpdates: [],
    recurringExpenses: [],
    recurringLogs: [],
    settings: null,
    profile: null,
    avatar: null,
    achievements: [],
    streak: null,
  };
}

describe('validateRestoreData', () => {
  it('passes for empty data', () => {
    expect(() => validateRestoreData(emptyData())).not.toThrow();
  });

  it('passes when all FKs are satisfied', () => {
    const data: BackupData = {
      ...emptyData(),
      months: [{ id: 1 }, { id: 2 }],
      expenses: [
        { id: 10, month_id: 1 },
        { id: 11, month_id: 2 },
      ],
      investments: [{ id: 20 }],
      investmentUpdates: [{ id: 30, saving_item_id: 20 }],
      recurringExpenses: [{ id: 40 }],
      recurringLogs: [{ id: 50, recurring_expense_id: 40, expense_id: 10 }],
    };
    expect(() => validateRestoreData(data)).not.toThrow();
  });

  // ── expense → month FK ────────────────────────────────────────────────────

  it('rejects expense with unknown month_id', () => {
    const data: BackupData = {
      ...emptyData(),
      months: [{ id: 1 }],
      expenses: [{ id: 10, month_id: 99 }],
    };
    expect(() => validateRestoreData(data)).toThrow('month 99');
  });

  it('passes when expense month_id is null (no FK constraint)', () => {
    const data: BackupData = {
      ...emptyData(),
      expenses: [{ id: 10, month_id: null }],
    };
    expect(() => validateRestoreData(data)).not.toThrow();
  });

  it('rejects multiple expenses where one has a bad month_id', () => {
    const data: BackupData = {
      ...emptyData(),
      months: [{ id: 1 }],
      expenses: [
        { id: 10, month_id: 1 },
        { id: 11, month_id: 999 },
      ],
    };
    expect(() => validateRestoreData(data)).toThrow('month 999');
  });

  // ── investmentUpdate → savings_item FK ───────────────────────────────────

  it('rejects investment update with unknown saving_item_id', () => {
    const data: BackupData = {
      ...emptyData(),
      investments: [{ id: 20 }],
      investmentUpdates: [{ id: 30, saving_item_id: 99 }],
    };
    expect(() => validateRestoreData(data)).toThrow('investment 99');
  });

  it('passes when investmentUpdate saving_item_id is null', () => {
    const data: BackupData = {
      ...emptyData(),
      investmentUpdates: [{ id: 30, saving_item_id: null }],
    };
    expect(() => validateRestoreData(data)).not.toThrow();
  });

  // ── recurringLog → recurringExpense FK ───────────────────────────────────

  it('rejects recurring log with unknown recurring_expense_id', () => {
    const data: BackupData = {
      ...emptyData(),
      recurringExpenses: [{ id: 40 }],
      recurringLogs: [{ id: 50, recurring_expense_id: 99, expense_id: null }],
    };
    expect(() => validateRestoreData(data)).toThrow('recurring expense 99');
  });

  // ── recurringLog → expense FK ─────────────────────────────────────────────

  it('rejects recurring log with unknown expense_id', () => {
    const data: BackupData = {
      ...emptyData(),
      expenses: [{ id: 10, month_id: null }],
      recurringExpenses: [{ id: 40 }],
      recurringLogs: [{ id: 50, recurring_expense_id: 40, expense_id: 99 }],
    };
    expect(() => validateRestoreData(data)).toThrow('expense 99');
  });

  it('passes when recurringLog expense_id is null', () => {
    const data: BackupData = {
      ...emptyData(),
      recurringExpenses: [{ id: 40 }],
      recurringLogs: [{ id: 50, recurring_expense_id: 40, expense_id: null }],
    };
    expect(() => validateRestoreData(data)).not.toThrow();
  });

  // ── optional field tolerance ──────────────────────────────────────────────

  it('handles missing recurringLogs gracefully (older backups)', () => {
    const data = {
      ...emptyData(),
      recurringLogs: undefined as unknown as BackupData['recurringLogs'],
    };
    expect(() => validateRestoreData(data)).not.toThrow();
  });

  it('handles empty recurringLogs array', () => {
    const data = { ...emptyData(), recurringLogs: [] };
    expect(() => validateRestoreData(data)).not.toThrow();
  });
});

// ─── BackupData shape completeness ───────────────────────────────────────────

describe('BackupData shape completeness', () => {
  it('BackupData includes all 11 user-data table keys', () => {
    const data = emptyData();
    // Every table in the v17 schema that holds user data must appear here.
    // If a new table is added to migrations.ts, add it to BackupData and to this list.
    const expectedKeys: (keyof BackupData)[] = [
      'months', // months table
      'expenses', // expenses table
      'investments', // savings_items table
      'investmentUpdates', // savings_updates table
      'recurringExpenses', // recurring_expenses table
      'recurringLogs', // recurring_logs table
      'settings', // app_settings table (singleton)
      'profile', // profile table (singleton)
      'avatar', // avatar_config table (singleton)
      'achievements', // achievements table
      'streak', // streak table (singleton)
    ];
    for (const key of expectedKeys) {
      expect(data).toHaveProperty(key);
    }
    // Also assert the count so this test fails if a key is added to BackupData
    // without a corresponding entry above.
    expect(Object.keys(data).length).toBe(expectedKeys.length);
  });

  it('BackupFile shape includes app, versions, exportedAt, data', () => {
    const file = minimalBackup();
    expect(file).toHaveProperty('app', 'BudgetBull');
    expect(file).toHaveProperty('backupVersion');
    expect(file).toHaveProperty('schemaVersion');
    expect(file).toHaveProperty('exportedAt');
    expect(file).toHaveProperty('data');
  });
});
