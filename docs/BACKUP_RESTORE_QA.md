# Backup & Restore — QA Checklist

Use this checklist before any release that touches `lib/backup.ts`, `db/migrations.ts`,
`app/settings.tsx` (the Settings screen), or any SQLite table schema.

---

## Table coverage (v17 schema)

Every user-data table in the database must be included in the backup.
Current coverage (all ✅):

| DB table             | BackupData key      | Backup query                                   | Restore step               |
| -------------------- | ------------------- | ---------------------------------------------- | -------------------------- |
| `app_settings`       | `settings`          | `SELECT * FROM app_settings WHERE id = 1`      | UPDATE singleton row       |
| `profile`            | `profile`           | `SELECT * FROM profile WHERE id = 1`           | UPDATE singleton row       |
| `months`             | `months`            | `SELECT * FROM months ORDER BY month_key`      | INSERT each row            |
| `expenses`           | `expenses`          | `SELECT * FROM expenses ORDER BY id`           | INSERT each row            |
| `savings_items`      | `investments`       | `SELECT * FROM savings_items ORDER BY id`      | INSERT each row            |
| `savings_updates`    | `investmentUpdates` | `SELECT * FROM savings_updates ORDER BY id`    | INSERT each row            |
| `recurring_expenses` | `recurringExpenses` | `SELECT * FROM recurring_expenses ORDER BY id` | INSERT each row            |
| `recurring_logs`     | `recurringLogs`     | `SELECT * FROM recurring_logs ORDER BY id`     | INSERT each row            |
| `avatar_config`      | `avatar`            | `SELECT * FROM avatar_config WHERE id = 1`     | UPDATE singleton row       |
| `achievements`       | `achievements`      | `SELECT * FROM achievements`                   | INSERT OR REPLACE each row |
| `streak`             | `streak`            | `SELECT * FROM streak WHERE id = 1`            | UPDATE singleton row       |

**If you add a new user-data table** to migrations.ts, you must:

1. Add a key to `BackupData` in `lib/backup.ts`
2. Add a `SELECT *` query to `createBackup`
3. Add a DELETE + INSERT block to `restoreFromBackup`
4. Add the key to the `expectedKeys` array in `__tests__/backup.test.ts`

---

## Versioning

- **`BACKUP_VERSION`** — file format version. Increment only when the JSON structure itself
  changes (new top-level keys, renamed fields). Backups with a higher `backupVersion` than
  the current build will be rejected with a "update the app" error.

- **`BACKUP_SCHEMA_VERSION`** — derived from `MIGRATIONS_TARGET_VERSION` in `db/migrations.ts`.
  This value is written into every backup file to document which DB schema produced it.
  It is **not** used to reject restores — older schemas are restorable because the restore
  SQL uses explicit column lists with safe defaults (`b(field) ?? defaultValue`).

---

## Manual QA checklist

Run through the following scenarios on a physical device or simulator before releasing.

### Scenario 1 — Backup from a fresh app

1. Install the app fresh (or reset via Settings → Danger zone → Reset app data).
2. Complete onboarding. Do not add any data.
3. Go to **Profile → Settings → Backup & Restore → Create Full Backup**.
4. Share the `.json` file to your Files app.
5. Open the file in a text editor and confirm:
   - `"app": "BudgetBull"`
   - `"backupVersion": 1`
   - `"schemaVersion": 17` (or current target)
   - All 11 keys present under `"data"`
   - Arrays for `months`, `expenses`, etc. are empty `[]`
   - Singleton rows (`settings`, `profile`, `avatar`, `streak`) are present as objects

**Expected:** backup succeeds, file is well-formed JSON, all keys present.

---

### Scenario 2 — Backup with real data

1. Set up a month with income and budget split.
2. Add at least 3 expenses (some Must, some Want), including one with a category.
3. Add 2 investments (one Crypto, one ETF).
4. Add 2 recurring expenses.
5. Apply one recurring expense to the current month.
6. Go through at least one month close/rollover.
7. Create a full backup.
8. Inspect the JSON:
   - `months` has 2 entries (one closed, one active)
   - `expenses` reflects all logged expenses
   - `investments` reflects both holdings
   - `investmentUpdates` reflects initial snapshots
   - `recurringExpenses` has 2 entries
   - `recurringLogs` has 1 entry (the applied one)
   - `streak` has the correct join and open dates

**Expected:** backup reflects exact app state. No data missing.

---

### Scenario 3 — Restore over an empty app

1. Create a full backup per Scenario 2.
2. Reset the app (Settings → Danger zone → Reset app data).
3. Complete onboarding again.
4. Go to **Settings → Backup & Restore → Restore From Backup**.
5. Pick the backup file.
6. Review the preview modal — confirm the row counts match the backup.
7. Tap **Restore & Replace Data**.
8. Confirm post-restore routing:
   - The app automatically navigates to the **Home** tab immediately after restore completes (no manual navigation required).
   - No error banner or loading spinner is stuck on screen.
9. Navigate through the app and verify:
   - The correct month is active with the right income and split
   - All expenses are present with correct amounts, buckets, and categories
   - Both investments are listed with correct values
   - Recurring expenses are listed and the applied one shows as logged
   - Avatar and profile data match the original

**Expected:** restore completes, app navigates directly to the Home tab, all data is intact.

---

### Scenario 4 — Restore over an app with existing data

1. Start with existing data in the app (different from the backup).
2. Go to **Settings → Backup & Restore → Restore From Backup**.
3. Pick the Scenario 2 backup.
4. Read the warning in the preview modal carefully.
5. Tap **Restore & Replace Data**.
6. Verify the pre-restore data is gone and the backup data is restored.

**Expected:** existing data is completely replaced; no old data survives.

---

### Scenario 5 — Invalid JSON file

1. Create a plain text file named `bad-backup.json` containing `{ not valid json `.
2. Go to **Settings → Backup & Restore → Restore From Backup**.
3. Pick `bad-backup.json`.
4. Confirm an error message appears (not a crash).

**Expected:** error alert "The selected file is not valid JSON…". No data changed.

---

### Scenario 6 — Wrong format (not a BudgetBull backup)

1. Export a months CSV from **Settings → Export CSV Files → Monthly budgets**.
2. Rename the CSV to `fake-backup.json`.
3. Go to **Settings → Backup & Restore → Restore From Backup**.
4. Pick `fake-backup.json`.
5. Confirm an error message appears.

**Expected:** error alert "Not a BudgetBull backup file." No data changed.

---

### Scenario 7 — Incompatible backup version (future app format)

1. Open a valid backup `.json` in a text editor.
2. Change `"backupVersion": 1` to `"backupVersion": 999`.
3. Save it as `future-backup.json`.
4. Go to **Settings → Backup & Restore → Restore From Backup**.
5. Pick `future-backup.json`.
6. Confirm an error message appears.

**Expected:** error alert "This backup was made with a newer version of BudgetBull…
Update the app and try again." No data changed.

---

### Scenario 8 — User cancels the document picker

1. Go to **Settings → Backup & Restore → Restore From Backup**.
2. When the file picker opens, tap **Cancel**.
3. Confirm the settings screen is unchanged and no error is shown.

**Expected:** picker closes silently. Restore never starts.

---

### Scenario 9 — User dismisses the preview modal

1. Go to **Settings → Backup & Restore → Restore From Backup**.
2. Pick a valid backup file.
3. When the preview modal appears, tap **Cancel**.
4. Confirm no data was changed.

**Expected:** modal closes. Existing data is untouched.

---

### Scenario 10 — Restore failure mid-transaction

> This is hard to trigger manually. The unit test suite covers the FK-validation path.
> To confirm atomicity manually:

1. Construct a JSON backup where one expense references a non-existent `month_id`
   (e.g. edit the file and change a `month_id` to `9999`).
2. Pick the file in **Restore From Backup**.
3. The FK validation in `validateRestoreData` should fire before any DB writes.
4. Confirm the error message appears and existing app data is still intact.

**Expected:** error alert "Backup is inconsistent: expense (id …) references month 9999…"
No data changed.

---

### Scenario 11 — CSV exports still work after a restore

1. Complete Scenario 3 (restore over empty app) so you have real data in the app.
2. Go to **Settings → Export CSV Files**.
3. Tap **Monthly budgets** → confirm the share sheet opens with a `.csv` file containing the restored months.
4. Tap **Expenses** → confirm the share sheet opens with a `.csv` file containing the restored expenses.
5. Tap **Investments** → confirm the share sheet opens with a `.csv` file containing the restored investments.
6. Open each file in a text editor or spreadsheet and verify the row counts match the data you restored.

**Expected:** all three CSV exports complete successfully and reflect the restored data. CSV export is unaffected by backup/restore operations.

---

## Automated test coverage

Run before every release:

```bash
npm run typecheck    # zero errors
npm run lint         # zero errors (warnings allowed)
npm test             # all tests pass, including __tests__/backup.test.ts
npm run format:check # zero formatting violations
```

Key test file: `__tests__/backup.test.ts`

Tests cover:

- Schema version constants in sync (`BACKUP_SCHEMA_VERSION === MIGRATIONS_TARGET_VERSION`)
- `validateBackup` happy path (minimal, with data, old schemaVersion)
- `validateBackup` rejection of: null, undefined, string, number, boolean, array, wrong app name,
  missing/invalid backupVersion, missing/wrong-type schemaVersion and exportedAt,
  missing/wrong-type data section, each required array field
- `validateBackup` acceptance of optional nullable fields
- `readRestorePreview` counts and metadata
- `validateRestoreData` FK checks (all three FK relationships)
- `BackupData` shape completeness (all 11 table keys present and accounted for)
