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

| Feature | Details |
|---|---|
| Must / Want / Invest split | Set percentages at onboarding, adjust anytime in Settings |
| Monthly budget cycle | Income-based, rolls over unspent balances per your rollover rules |
| Expense tracking | Auto-suggested bucket (Must/Want), editable after the fact |
| Past-month corrections | Log missed expenses to closed months; carryover auto-adjusts |
| Investment portfolio | Manual tracking with full value history and SVG line chart |
| Crypto support | CoinGecko live price refresh for tracked coins |
| Budget grading | A+–F grade with per-bucket explanation and improvement hints |
| Rollover settings | Per-bucket rules: route surplus to Invest, Want, or Must |
| Profile & streaks | Avatar customisation, achievements, daily streak tracking |
| League system | Iron → Bronze → Silver → Gold → Apex, gated by score + months |
| Multi-currency | ILS, USD, EUR throughout |
| Receipt scanning | Camera or photo library → AI extracts merchant, amount, date |
| AI budget review | Claude-powered monthly analysis with personalised recommendations |
| Apple Pay shortcut | Siri Shortcut integration auto-adds expenses from Apple Pay notifications |
| Calculators | Placeholder hub for finance tools (compound interest, loan, salary, etc.) |
| Local-first | All data stored on-device in SQLite — no account, no sync |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native via Expo SDK 54 |
| Routing | Expo Router (file-based, typed routes) |
| Database | SQLite via `expo-sqlite` with versioned migrations |
| Language | TypeScript (strict) |
| State | React hooks — no external state library |
| Charts | Custom SVG line chart via `react-native-svg` |
| Icons | Ionicons (`@expo/vector-icons`) |
| Crypto prices | CoinGecko public API (no key required) |
| AI analysis | Claude API via a backend proxy (budget review + receipt scanning) |

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

## App structure

```
app/
  (tabs)/                      # 4 main tab screens
    home.tsx                   # Dashboard: budget overview, grade, quick stats
    history.tsx                # Full expense history with filters
    savings.tsx                # Investment portfolio overview (Invest tab)
    profile.tsx                # Profile, streak, achievements, nav to Settings
    settings.tsx               # Currency, rollover rules, split — opened from Profile
    tips.tsx                   # Budget tips — opened from Profile
  investment/[id].tsx          # Investment detail: chart, history, buy/sell
  onboarding.tsx               # 3-step onboarding wizard
  month-setup.tsx              # New-month setup flow
  expense-new.tsx              # Quick add expense modal
  expense-edit.tsx             # Edit or delete an expense
  expenses.tsx                 # Full expense list (current month)
  past-month-expense.tsx       # Log a missed expense on a closed month
  investment-new.tsx           # Add investment
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
  calculators.tsx              # Finance calculator hub (coming soon)

components/
  AppScreen.tsx                # Scrollable/static screen wrapper with safe area
  AppLogo.tsx                  # Brand mark — red badge, white bull, gold nose ring
  DatePickerField.tsx          # Reusable Today / Yesterday / Pick date chip row
  HumanAvatar.tsx              # Composable SVG avatar
  InvestmentForm.tsx           # Shared investment create/edit form
  InvestmentLineChart.tsx      # SVG portfolio chart with smooth Catmull-Rom curve; supports a compact `sparkline` variant (no axes, thinner stroke) used in the portfolio hero card

db/                            # All SQLite logic, one file per domain
  migrations.ts                # Versioned schema (current: v15)
  home.ts                      # Active month dashboard query
  months.ts                    # Month lifecycle: create, close, rollover
  expenses.ts                  # Expense CRUD + past-month correction
  expense-history.ts           # History tab queries
  investments.ts               # Investment CRUD
  investment-detail.ts         # Detail view + value updates
  settings.ts                  # Currency, rollover rules, split defaults
  profile.ts                   # User profile, league, score
  achievements.ts              # Achievement unlock logic
  avatar.ts                    # Avatar configuration
  aiAnalysis.ts                # Queries for AI budget review input data

lib/
  money.ts                     # Parse and format cents ↔ display strings
  date.ts                      # Date formatting and month key utilities
  grade.ts                     # A+–F budget grade + per-bucket explanation
  coins.ts                     # CoinGecko coin search
  expenseClassifier.ts         # Suggest Must vs Want for new expenses
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

theme/
  colors.ts                    # Single source of truth for the colour palette (includes `ink` for hero cards, `gold` for achievements)
  fonts.ts                     # Font family constants (Space Grotesk)
  tokens.ts                    # Spacing, radius, shadows, type scale, easing
```

---

## Data model

- All monetary values are stored as **integer cents** to avoid floating-point issues.
- Monthly budget state lives in the `months` table; expenses are tied to a `month_id`.
- Investments live in `savings_items`; value snapshots are in `savings_updates`.
- App settings (currency, rollover targets, split defaults) are a single row in `app_settings`.
- All data is **local-only** — nothing leaves the device.

---

## Database migrations

Schema changes use a linear versioning pattern in `db/migrations.ts`. The current target version is **v15**. Each version gate runs `ALTER TABLE` statements and bumps `PRAGMA user_version`. Fresh installs skip straight to the full schema at v0 and set `user_version = 15`.

---

## Budget grading

Each month earns a grade (A+ down to F) based on how well spending stayed within the Must and Want budgets, with a bonus for any Keep/Invest contribution.

- **Must** overspending is penalised more heavily than Want overspending, because essential costs are less discretionary.
- **Keep/Invest** activity adds a small bonus to the score.
- Two consecutive A+ months earn an **S** grade.

The Home screen shows the current grade alongside a 2–3 line plain-language explanation and one actionable improvement hint.

---

## Current status

The app is in active personal development. Core budgeting flows are complete and stable.

**Working now:**
- Full monthly cycle (setup → track → close → rollover)
- Expense add / edit / delete, including corrections to past months
- Investment portfolio with value history and chart (buy, sell, value updates)
- Receipt scanning via camera or photo library with AI extraction
- AI-powered monthly budget review via Claude
- Apple Pay Siri Shortcut integration — expenses auto-added from notifications
- Grading with plain-language explanation
- Streaks, achievements, avatar, league progression
- Multi-currency, rollover settings, onboarding
- Finance calculators hub (UI scaffolded, logic coming)
- Ink hero cards on Home, Investments, and Profile screens — large `HeroNumber` amount, eyebrow labels, and a mono pace/gain strip
- Home breakdown replaced with a compact meters card: per-bucket name, used/planned amounts, pace label, and a 96px progress bar with a pace-position tick
- Investments holdings list rebuilt with letter-avatar rows, percentage gain, and a 2-point sparkline in the hero card
- Profile identity, streak, and league collapsed into a single hero card; achievements rendered as a 4-column locked/unlocked tile grid

**Possible future improvements:**
- Recurring expenses (infrastructure exists via `is_recurring` column)
- iCloud / local backup / export to CSV
- Widgets (Expo Widget extension)
- Notification reminders
- Multi-hop rollover cascade for past-month corrections
- App Store distribution
- Calculator implementations (compound interest, loan payment, net salary, etc.)

---

## Local data note

BudgetBull stores everything in an SQLite database on your device. There is no backend account or sync. Optional network calls:

- **CoinGecko** — live crypto price lookups on the Invest tab
- **AI backend proxy** — receipt scanning and budget analysis (requires a configured backend endpoint)

Uninstalling the app will erase all data. Back up your device regularly if this data matters to you.
