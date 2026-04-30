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
      months: [{ id: 1, month_key: '2024-01' }, { id: 2, month_key: '2024-02' }],
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

// ─── validateBackup ───────────────────────────────────────────────────────────

describe('validateBackup', () => {
  it('accepts a minimal valid backup', () => {
    const b = minimalBackup();
    expect(() => validateBackup(b)).not.toThrow();
    expect(validateBackup(b)).toEqual(b);
  });

  it('accepts a backup with data', () => {
    const b = backupWithData();
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts backups with schemaVersion different from current (older backups)', () => {
    const b = minimalBackup({ schemaVersion: 10 });
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('rejects backups with a higher backupVersion than current (newer app required)', () => {
    const b = minimalBackup({ backupVersion: BACKUP_VERSION + 1 });
    expect(() => validateBackup(b)).toThrow('newer version');
  });

  it('rejects null', () => {
    expect(() => validateBackup(null)).toThrow('not a JSON object');
  });

  it('rejects a plain string', () => {
    expect(() => validateBackup('hello')).toThrow('not a JSON object');
  });

  it('rejects a wrong app name', () => {
    const b = { ...minimalBackup(), app: 'OtherApp' };
    expect(() => validateBackup(b)).toThrow('Not a BudgetBull backup');
  });

  it('rejects missing backupVersion', () => {
    const { backupVersion: _bv, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('backupVersion');
  });

  it('rejects backupVersion = 0', () => {
    const b = { ...minimalBackup(), backupVersion: 0 };
    expect(() => validateBackup(b)).toThrow('backupVersion');
  });

  it('rejects missing schemaVersion', () => {
    const { schemaVersion: _sv, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('schemaVersion');
  });

  it('rejects missing exportedAt', () => {
    const { exportedAt: _ea, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('exportedAt');
  });

  it('rejects missing data', () => {
    const { data: _d, ...b } = minimalBackup();
    expect(() => validateBackup(b)).toThrow('data');
  });

  it('rejects data that is an array (not an object)', () => {
    const b = { ...minimalBackup(), data: [] };
    expect(() => validateBackup(b)).toThrow('data');
  });

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

  it('rejects expense with missing month_id', () => {
    const data: BackupData = {
      ...emptyData(),
      months: [{ id: 1 }],
      expenses: [{ id: 10, month_id: 99 }],
    };
    expect(() => validateRestoreData(data)).toThrow('month 99');
  });

  it('rejects investment update with missing saving_item_id', () => {
    const data: BackupData = {
      ...emptyData(),
      investments: [{ id: 20 }],
      investmentUpdates: [{ id: 30, saving_item_id: 99 }],
    };
    expect(() => validateRestoreData(data)).toThrow('investment 99');
  });

  it('rejects recurring log with missing recurring_expense_id', () => {
    const data: BackupData = {
      ...emptyData(),
      recurringExpenses: [{ id: 40 }],
      recurringLogs: [{ id: 50, recurring_expense_id: 99, expense_id: null }],
    };
    expect(() => validateRestoreData(data)).toThrow('recurring expense 99');
  });

  it('rejects recurring log with missing expense_id', () => {
    const data: BackupData = {
      ...emptyData(),
      expenses: [{ id: 10, month_id: null }],
      recurringExpenses: [{ id: 40 }],
      recurringLogs: [{ id: 50, recurring_expense_id: 40, expense_id: 99 }],
    };
    expect(() => validateRestoreData(data)).toThrow('expense 99');
  });

  it('handles missing recurringLogs gracefully (older backups)', () => {
    const data = { ...emptyData(), recurringLogs: undefined as unknown as BackupData['recurringLogs'] };
    expect(() => validateRestoreData(data)).not.toThrow();
  });
});

// ─── BackupData shape completeness ───────────────────────────────────────────

describe('BackupData shape completeness', () => {
  it('BackupData includes all required table keys', () => {
    const data = emptyData();
    const keys: (keyof BackupData)[] = [
      'months',
      'expenses',
      'investments',
      'investmentUpdates',
      'recurringExpenses',
      'recurringLogs',
      'settings',
      'profile',
      'avatar',
      'achievements',
      'streak',
    ];
    for (const key of keys) {
      expect(data).toHaveProperty(key);
    }
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
