# BudgetBull

A focused personal finance app for iPhone. Allocate your income into three buckets — **Must**, **Want**, and **Invest** — then track every spend and watch your portfolio grow.

---

## What it does

Most budgeting apps are overwhelming. BudgetBull does one thing well: it forces a clear monthly decision upfront (how much goes where?), then stays out of your way while you track it.

- Log an expense in seconds, with auto-classification into Must or Want
- See your remaining budget at a glance from the home dashboard
- Track investments manually — stocks, ETFs, crypto, real estate, savings
- Close each month, carry rollovers forward, and start fresh

---

## Core features

| Feature                    | Details                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Must / Want / Invest split | Set percentages at onboarding, adjust anytime in Settings                                                  |
| Monthly budget cycle       | Income-based, rolls over unspent balances per your rollover rules                                          |
| Expense tracking           | Auto-suggested bucket (Must/Want), editable after the fact; auto-classifies by merchant name               |
| Past-month corrections     | Log missed expenses to closed months; carryover auto-adjusts across all subsequent months                  |
| Recurring expenses         | Monthly templates with configurable day-of-month and bucket; apply to any month in one tap                 |
| Investment portfolio       | Manual tracking with full value history and SVG line chart; real portfolio timeline from dated snapshots   |
| Crypto support             | CoinGecko live price refresh for tracked coins                                                             |
| Budget grading             | A+–F grade with per-bucket explanation and improvement hints                                               |
| Rollover settings          | Per-bucket rules: route surplus to Invest, Want, or Must; multi-month recalculation cascade                |
| CSV export                 | Export months, expenses, or investments as `.csv` from Settings                                            |
| Full backup / restore      | JSON backup of all data; restore from file with a preview before overwrite                                 |
| Privacy & data screen      | Explains exactly what data is stored, what is never collected, and what network calls are made             |
| Profile & streaks          | Avatar customisation, achievements, daily streak tracking                                                  |
| League system              | Iron → Bronze → Silver → Gold → Apex, gated by score + months                                              |
| Multi-currency             | ILS, USD, EUR throughout                                                                                   |
| Receipt scanning           | Camera or photo library → AI extracts merchant, amount, date                                               |
| AI budget review           | Claude-powered monthly analysis with personalised recommendations                                          |
| Apple Pay shortcut         | Siri Shortcut integration auto-adds expenses from Apple Pay notifications                                  |
| Calculators                | Six finance tools: compound interest, loan payment, net salary, savings goal, budget split, emergency fund |
| Local-first                | All data stored on-device in SQLite — no account, no sync                                                  |

---

## Tech stack

| Layer         | Choice                                                            |
| ------------- | ----------------------------------------------------------------- |
| Framework     | React Native via Expo SDK 54                                      |
| Routing       | Expo Router (file-based, typed routes)                            |
| Database      | SQLite via `expo-sqlite` with versioned migrations                |
| Language      | TypeScript (strict)                                               |
| State         | React hooks — no external state library                           |
| Charts        | Custom SVG line chart via `react-native-svg`                      |
| Icons         | Ionicons (`@expo/vector-icons`)                                   |
| Crypto prices | CoinGecko public API (no key required)                            |
| AI analysis   | Claude API via a backend proxy (budget review + receipt scanning) |

---

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- iOS Simulator (Xcode) or physical iPhone with **Expo Go**

---

## Running locally

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start
```

Scan the QR code with Expo Go, or press `i` to open the iOS Simulator.

> The app targets iPhone first. Most UI decisions and safe area handling are iOS-optimised. Android works but is not the primary focus.

---

## Scripts

```bash
npm run typecheck    # TypeScript — zero errors required before release
npm run lint         # ESLint via expo lint
npm test             # Jest unit tests
npm run format       # Prettier — write in-place
npm run format:check # Prettier — check only (CI mode)
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values you need. `.env` is gitignored.

```bash
cp .env.example .env
```

| Variable                       | Default   | Required for                                                |
| ------------------------------ | --------- | ----------------------------------------------------------- |
| `EXPO_PUBLIC_RECEIPT_SCAN_URL` | _(empty)_ | Receipt scanning                                            |
| `EXPO_PUBLIC_AI_PROVIDER`      | `mock`    | AI budget review (remote mode)                              |
| `EXPO_PUBLIC_AI_ENDPOINT`      | _(empty)_ | AI budget review (remote mode)                              |
| `EXPO_PUBLIC_AI_API_KEY`       | _(empty)_ | AI budget review (remote mode, if your proxy requires auth) |

### Offline vs. network features

| Feature                              | Offline?          | What it needs                                                |
| ------------------------------------ | ----------------- | ------------------------------------------------------------ |
| Monthly budgeting, expense tracking  | ✅ Always offline | Nothing                                                      |
| Recurring expenses                   | ✅ Always offline | Nothing                                                      |
| Investment portfolio, value history  | ✅ Always offline | Nothing                                                      |
| Budget grading (A+–F)                | ✅ Always offline | Nothing                                                      |
| CSV export, full backup / restore    | ✅ Always offline | Nothing                                                      |
| Apple Pay / Siri Shortcut            | ✅ Always offline | Nothing                                                      |
| AI budget review (`mock` provider)   | ✅ Offline        | Nothing — the mock runs on-device with your real data        |
| Crypto live price refresh            | 🌐 Network        | CoinGecko public API — no key needed                         |
| Receipt scanning                     | 🌐 Network        | `EXPO_PUBLIC_RECEIPT_SCAN_URL` pointing to your backend      |
| AI budget review (`remote` provider) | 🌐 Network        | `EXPO_PUBLIC_AI_PROVIDER=remote` + `EXPO_PUBLIC_AI_ENDPOINT` |

### Configuring receipt scanning

Receipt scanning is powered by a backend you control — the app never calls any AI API directly.

1. Deploy a backend endpoint that accepts `POST { image: "<base64 jpeg>" }` and returns an `ExtractedReceipt` JSON object (see `lib/receipts/types.ts` for the shape).
2. Set `EXPO_PUBLIC_RECEIPT_SCAN_URL=https://your-backend.com/receipt-scan` in `.env`.
3. Rebuild the app (env vars are baked in at build time with Expo).

When `EXPO_PUBLIC_RECEIPT_SCAN_URL` is unset, the receipt scan screen shows a "not available" notice and scanning is disabled. No crash.

Your backend should:

- Call a vision model (e.g. GPT-4o, Claude 3) with the image
- Return the extracted fields (`merchant`, `amount`, `date`, `items`, `confidence`, etc.)
- Handle auth and rate-limiting server-side

The client (`lib/receipts/remoteProvider.ts`) normalises the response and handles `network_error`, `api_error`, `parse_error`, and `unreadable` error codes gracefully.

### Configuring AI budget review

The default `mock` provider runs entirely on-device and produces real data-driven analysis from your SQLite data — no configuration needed.

To connect a real LLM backend:

1. Set `EXPO_PUBLIC_AI_PROVIDER=remote` in `.env`.
2. Set `EXPO_PUBLIC_AI_ENDPOINT=https://your-backend.com/budget-analysis`.
3. Optionally set `EXPO_PUBLIC_AI_API_KEY` if your endpoint requires a bearer token.
4. Rebuild the app.

Your endpoint must accept `POST <AnalysisInput JSON>` and return `<BudgetAnalysisResponse JSON>` (see `lib/ai/types.ts`).

### Security — API keys

> **`EXPO_PUBLIC_*` variables are embedded in the JavaScript bundle** and are readable by anyone who downloads your app. Never put a production API key (Anthropic, OpenAI, etc.) directly in an `EXPO_PUBLIC_*` variable.

Use a backend proxy:

- The proxy holds the real API key server-side.
- Authenticate the mobile app with a short-lived session token or device-check mechanism.
- Set that session token as `EXPO_PUBLIC_AI_API_KEY` (or pass it at runtime) — it's not a secret even if extracted, because it's scoped and revocable.

---

## App structure

```
app/
  (tabs)/                      # 4 main tab screens
    home.tsx                   # Dashboard: budget overview, grade, quick stats
    history.tsx                # Full expense history with filters
    savings.tsx                # Investment portfolio overview (Invest tab)
    profile.tsx                # Profile, streak, achievements, nav to Settings
  investment/[id].tsx          # Investment detail: chart, history, buy/sell
  settings.tsx                 # Currency, rollover rules, split, export, backup — stack screen from Profile
  privacy.tsx                  # Privacy & data screen — what is/isn't stored, network calls
  recurring.tsx                # Recurring expenses — create, edit, pause, apply to current month
  onboarding.tsx               # 3-step onboarding wizard
  month-setup.tsx              # New-month setup flow
  expense-new.tsx              # Quick add expense modal
  expense-edit.tsx             # Edit or delete an expense
  expenses.tsx                 # Full expense list (current month)
  past-month-expense.tsx       # Log a missed expense on a closed month
  investment-new.tsx           # Add investment — path selector (existing / new purchase / cash balance)
  investment-edit.tsx          # Edit investment metadata
  investment-purchase.tsx      # Record a buy/sell with month contribution
  investment-value-update.tsx  # Record a total-value snapshot
  investment-update-new.tsx    # Generic new update (type selector)
  investment-update-edit.tsx   # Edit or delete an existing update entry
  avatar-edit.tsx              # Avatar customisation screen
  receipt-scan.tsx             # Camera / photo library receipt capture
  receipt-review.tsx           # Review and confirm AI-extracted receipt data
  add-expense-from-shortcut.tsx  # Handles Siri Shortcut deep-link (Apple Pay)
  ai-budget-review.tsx         # Claude-powered monthly budget analysis screen
  calculators.tsx              # Six finance calculators: compound interest, loan payment, net salary, savings goal, budget split, emergency fund

components/
  AppScreen.tsx                # Scrollable/static screen wrapper with safe area
  AppLogo.tsx                  # Brand mark — red badge, white bull, gold nose ring
  DatePickerField.tsx          # Reusable Today / Yesterday / Pick date chip row
  HumanAvatar.tsx              # Composable SVG avatar
  InvestmentForm.tsx           # Shared investment create/edit form; mode prop drives field set
  InvestmentLineChart.tsx      # SVG portfolio chart with smooth Catmull-Rom curve; supports a compact `sparkline` variant (no axes, thinner stroke) used in the portfolio hero card

db/                            # All SQLite logic, one file per domain
  migrations.ts                # Versioned schema (current: v17)
  home.ts                      # Active month dashboard query
  months.ts                    # Month lifecycle: create, close, rollover
  rollover.ts                  # Multi-month rollover recalculation cascade (past-month corrections)
  expenses.ts                  # Expense CRUD + past-month correction
  expense-history.ts           # History tab queries
  investments.ts               # Investment CRUD + portfolio timeline query
  investment-detail.ts         # Detail view + value updates
  recurring.ts                 # Recurring expense CRUD and apply-to-month logic
  settings.ts                  # Currency, rollover rules, split defaults
  profile.ts                   # User profile, league, score
  achievements.ts              # Achievement unlock logic
  avatar.ts                    # Avatar configuration
  aiAnalysis.ts                # Queries for AI budget review input data

lib/
  money.ts                     # Parse and format cents ↔ display strings
  date.ts                      # Date formatting and month key utilities
  budget.ts                    # Pure budget-math: remainder and rollover bonus calculations
  grade.ts                     # A+–F budget grade + per-bucket explanation
  coins.ts                     # CoinGecko coin search
  expenseCategories.ts         # Must/Want category chip definitions (labels + emoji)
  expenseClassifier.ts         # Suggest Must vs Want for new expenses; auto-detect category from merchant name
  recurring.ts                 # Recurring date helper (clamp day-of-month per month length)
  export.ts                    # CSV export: months, expenses, and investments — shared via system share sheet
  backup.ts                    # Full JSON backup and restore: all tables, versioned file format
  haptics.ts                   # Centralised haptic feedback helpers
  parseShortcutParams.ts       # Parse URL params from Siri Shortcut deep-link
  receiptClassifier.ts         # Map receipt category suggestions to Must/Want
  receiptImageState.ts         # In-memory bridge: scan screen → review screen
  receiptPrompt.ts             # System prompt reference for backend receipt service
  ai/                          # AI budget analysis pipeline
    types.ts                   # Shared input/output types
    buildAnalysisInput.ts      # Assembles MonthSnapshot + ExpenseSample data
    provider.ts                # Provider interface
    remoteProvider.ts          # Calls Claude via backend proxy
    mockProvider.ts            # Local stub for development
    index.ts                   # Public API: analyzeBudget, buildAnalysisInput
  receipts/                    # Receipt scanning pipeline
    types.ts                   # ExtractedReceipt type + ReceiptExtractionError
    provider.ts                # Provider interface
    remoteProvider.ts          # Calls backend vision endpoint
    mockProvider.ts            # Returns fixture data for development
    index.ts                   # Public API: extractReceipt

hooks/
  useExpenseForm.ts            # Expense form state: auto-classify by title, category locking, save
  useHomeData.ts               # Home screen data hook

theme/
  colors.ts                    # Single source of truth for the colour palette (includes `ink` for hero cards, `gold` for achievements)
  fonts.ts                     # Font family constants (Space Grotesk)
  tokens.ts                    # Spacing, radius, shadows, type scale, easing
```

---

## Data model

- All monetary values are stored as **integer cents** to avoid floating-point issues.
- Monthly budget state lives in the `months` table; expenses are tied to a `month_id`.
- Investments live in `savings_items`; every value snapshot (open, buy, sell, update, live-price refresh) is a row in `savings_updates`. The portfolio timeline chart on the Invest tab is built from these real snapshots — no data is invented.
- Recurring expense templates live in `recurring_expenses`; each time one is applied to a month an entry is written to `recurring_logs` (prevents double-application).
- App settings (currency, rollover targets, split defaults) are a single row in `app_settings`.
- All data is **local-only** — nothing leaves the device unless you explicitly use CSV export, full backup, or the configured backend endpoints.

---

## Data export and backup

### CSV export

Available in **Settings → Export CSV Files**. Three separate exports:

| Export      | What's included                                                                 |
| ----------- | ------------------------------------------------------------------------------- |
| Months      | One row per month: income, budget splits, spent totals, rollover amounts, grade |
| Expenses    | Every expense across all months: date, title, amount, bucket, category, note    |
| Investments | Every holding: name, category, opening date, cost basis, current value          |

CSV files are shared via the system share sheet (AirDrop, Files, email, etc.). They are not uploaded anywhere.

### Full backup

Available in **Settings → Backup & Restore → Create Full Backup**. Creates a single `.json` file containing:

- All months and their budget state
- All expenses
- All investments and their full value-update history
- All recurring expense templates and their application log
- Profile, avatar, achievements, streak
- App settings (currency, rollover rules, split percentages)

The file is tagged with a schema version so the app can detect when a backup was created with an older or newer DB schema.

### Restore

Available in **Settings → Backup & Restore → Restore From Backup**. Pick a `.json` file — the app shows a preview (month count, expense count, investment count, recurring count, and backup date) before you confirm. **Restore replaces all current data** — there is no merge. The operation is atomic; if anything fails, the existing data is left untouched.

> Backups made by a **newer** version of the app (higher `backupVersion`) are rejected with an "update the app" prompt. Backups from **older** schema versions are restorable — the restore logic handles missing columns with safe defaults, so you do not need to match schema versions exactly.

---

## Database migrations

Schema changes use a linear versioning pattern in `db/migrations.ts`. The current target version is **v17**. Each version gate runs `ALTER TABLE` statements and bumps `PRAGMA user_version`. Fresh installs skip straight to the full schema at v0 and set `user_version = 17`.

---

## Budget grading

Each month earns a grade (A+ down to F) based on how well spending stayed within the Must and Want budgets, with a bonus for any Keep/Invest contribution.

- **Must** overspending is penalised more heavily than Want overspending, because essential costs are less discretionary.
- **Keep/Invest** activity adds a small bonus to the score.
- Two consecutive A+ months earn an **S** grade.

The Home screen shows the current grade alongside a 2–3 line plain-language explanation and one actionable improvement hint.

---

## Platform support

| Platform | Status                    | Notes                                                                                                                                                   |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone   | ✅ Primary target         | All UI and safe-area handling is iPhone-optimised                                                                                                       |
| iPad     | ⚠️ Enabled, not optimised | `supportsTablet: true` is set (Expo default). The app runs and is usable on iPad, but the layout is iPhone-sized and not adapted for the larger canvas. |
| Android  | ⚠️ Builds, not tested     | Adaptive icons and edge-to-edge are configured. Core logic works. UI may have rough edges. Not a current focus.                                         |
| Web      | 🚧 Scaffold only          | `expo-router` web output is configured (`"output": "static"`) but the app is not tested or optimised for browsers.                                      |

If you intend to ship iPad or Android, audit safe area handling, font scaling, and the floating tab bar before release.

---

## Pre-release checklist

Run through this list before building a release or submitting to the App Store.

### Code quality

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm run lint` — zero ESLint errors or warnings
- [ ] `npm test` — all tests pass
- [ ] `npm run format:check` — no formatting drift

### Native project

- [ ] Run `expo prebuild --clean` to regenerate the iOS native project from `app.json`. This ensures all plugin-injected config (permissions, URL schemes, build settings) is applied correctly before archiving.
- [ ] Confirm `ios.bundleIdentifier` in `app.json` matches the App Store Connect record.
- [ ] Confirm `ios.buildNumber` in `app.json` is incremented from the last submission.
- [ ] Open in Xcode → Product → Archive. Confirm the build signs cleanly.

### Fresh install

- [ ] Delete the app from the simulator/device, install clean, complete onboarding.
- [ ] Confirm all four tabs load without errors.
- [ ] Add an expense, close the month, verify rollover.

### Upgrade / migration

- [ ] Install an older build over an existing data set.
- [ ] Confirm DB migrations run cleanly and no data is lost.
- [ ] Check that the active month, expense history, investments, and recurring expenses all display correctly after upgrade.

### Feature verification

- [ ] Add a recurring expense template; apply it to the current month; confirm it appears in the expense list and cannot be applied twice.
- [ ] Log expense via camera receipt scan (requires a configured backend).
- [ ] Log expense via Apple Pay / Siri Shortcut deep link.
- [ ] Crypto live price refresh on an investment with a valid coin ID; confirm a new `value_update` row appears in the investment history.
- [ ] Add an investment value update; confirm the portfolio trend chart on the Invest tab updates with a new data point.
- [ ] Export all three CSV types (Months, Expenses, Investments) via Settings — confirm the share sheet opens with a valid `.csv` file.
- [ ] Run a full backup — confirm a `.json` file is produced and can be opened.
- [ ] Restore from that backup — review the preview modal, confirm counts match, confirm data is intact after restore.
- [ ] Camera and photo library permission denial — confirm "Open Settings" is shown, not a crash.

### Optional feature states

- [ ] Build with `EXPO_PUBLIC_RECEIPT_SCAN_URL` unset. Confirm the receipt scan screen shows the "not available" notice and does not crash.
- [ ] Build with `EXPO_PUBLIC_AI_PROVIDER=mock` (default). Confirm the AI budget review loads and shows local analysis.
- [ ] Build with `EXPO_PUBLIC_AI_PROVIDER=remote` and a non-existent endpoint. Confirm the error state is shown with a retry option.

### Data safety

- [ ] Verify uninstall warning is visible to the user (Settings or onboarding).
- [ ] Confirm no data leaves the device except via explicit user export or the configured backend endpoints.

### App Store Connect

- [ ] App name, subtitle, description, and keywords filled in.
- [ ] Screenshots uploaded for iPhone 15 Pro Max (6.7″) at minimum.
- [ ] Privacy policy URL filled in (required even for local-only apps).
- [ ] Data-use declaration completed: select "No data collected" if no analytics/backend is active, or declare only the specific data types your backend processes.
- [ ] Age rating questionnaire completed.
- [x] `userInterfaceStyle` is set to `"light"` in `app.json`. The app uses a fixed warm-paper theme with no dark-mode colour variants; `"automatic"` would cause OS-level colour inversion in dark mode.

---

## Current status

The app is in active personal development. Core budgeting flows are complete and stable.

**Working now:**

- Full monthly cycle (setup → track → close → rollover)
- Multi-month rollover recalculation when past expenses are corrected
- Expense add / edit / delete, including corrections to past months
- Auto-classification of expenses by merchant name / keyword (Must vs Want + category)
- Recurring expense templates — monthly, configurable day-of-month, per-bucket
- Investment portfolio with value history and chart (buy, sell, value updates)
- Real portfolio timeline chart built from dated value snapshots; range selector (1M / 3M / YTD / All)
- Receipt scanning via camera or photo library with AI extraction
- AI-powered monthly budget review via Claude
- Apple Pay Siri Shortcut integration — expenses auto-added from notifications
- Grading with plain-language explanation
- Streaks, achievements, avatar, league progression
- Multi-currency, rollover settings, onboarding
- CSV export (months / expenses / investments) via Settings
- Full backup and restore (JSON, all tables, versioned format) via Settings
- Privacy & data screen documenting exactly what is and isn't stored
- Finance calculators (compound interest, loan payment, net salary, savings goal, budget split, emergency fund)

**Possible future improvements:**

- iCloud / cloud sync — all backup/export is currently local only; nothing syncs between devices
- Merge restore — current restore is a full replace; a merge mode that upserts without wiping would be safer
- Custom expense categories — currently hard-coded; user-editable lists would require schema changes and a management UI
- Advanced recurring schedules — only monthly (fixed day-of-month) is supported; weekly, custom intervals, and end-dates are not
- Better investment analytics — per-holding IRR, allocation breakdown, time-weighted return; current chart shows value history only
- Widgets (Expo Widget extension)
- Notification reminders
- App Store distribution

---

## Local data note

BudgetBull stores everything in an SQLite database on your device. There is no account, no sync, and no telemetry. The optional network calls are:

- **CoinGecko** — live crypto price refresh on the Invest tab (no API key required)
- **Receipt scanning backend** — only when `EXPO_PUBLIC_RECEIPT_SCAN_URL` is set
- **AI analysis backend** — only when `EXPO_PUBLIC_AI_PROVIDER=remote` and `EXPO_PUBLIC_AI_ENDPOINT` is set

All other features — budgeting, expense tracking, recurring expenses, investment portfolio, grading, CSV export, full backup/restore, streaks, and the default AI review — work fully offline.

Uninstalling the app will erase all data. Use **Settings → Backup & Restore → Create Full Backup** to save a copy before uninstalling or switching devices.
