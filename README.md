# BullBudget

A focused personal finance app for iPhone. Allocate your income into three buckets — **Must**, **Want**, and **Invest** — then track every spend and watch your portfolio grow.

> **Branding note:** `app.json` still uses `"name": "budget-app"` and `"slug": "budget-app"`. The display name visible to users should be updated to `"BullBudget"` when you're ready to publish.

---

## What it does

Most budgeting apps are overwhelming. BullBudget does one thing well: it forces a clear monthly decision upfront (how much goes where?), then stays out of your way while you track it.

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
  (tabs)/           # Tab screens: home, savings, history, profile, settings, tips
  investment/[id].tsx   # Investment detail (dynamic route)
  onboarding.tsx    # 3-step onboarding wizard
  month-setup.tsx   # New-month setup flow
  expense-new.tsx   # Quick add expense modal
  expense-edit.tsx  # Edit or delete an expense
  expenses.tsx      # Full expense list (current month)
  past-month-expense.tsx  # Log a missed expense on a closed month
  investment-new.tsx      # Add investment
  investment-edit.tsx     # Edit investment metadata
  investment-update-new.tsx  # Record a new investment value
  avatar-edit.tsx   # Avatar customisation screen

components/
  AppScreen.tsx     # Scrollable/static screen wrapper with safe area
  AppLogo.tsx       # Brand mark
  DatePickerField.tsx     # Reusable Today / Yesterday / Pick date chip row
  HumanAvatar.tsx   # Composable SVG avatar
  InvestmentForm.tsx      # Shared investment create/edit form
  InvestmentLineChart.tsx # SVG portfolio chart

db/                 # All SQLite logic, one file per domain
  migrations.ts     # Versioned schema (current: v14)
  home.ts           # Active month dashboard query
  months.ts         # Month lifecycle: create, close, rollover
  expenses.ts       # Expense CRUD + past-month correction
  expense-history.ts  # History tab queries
  investments.ts    # Investment CRUD
  investment-detail.ts  # Detail view + value updates
  settings.ts       # Currency, rollover rules, split defaults
  profile.ts        # User profile, league, score
  achievements.ts   # Achievement unlock logic
  avatar.ts         # Avatar configuration

lib/
  money.ts          # Parse and format cents ↔ display strings
  date.ts           # Date formatting and month key utilities
  grade.ts          # A+–F budget grade + per-bucket explanation
  coins.ts          # CoinGecko coin search
  expenseClassifier.ts  # Suggest Must vs Want for new expenses

theme/
  colors.ts         # Single source of truth for the colour palette
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

Schema changes use a linear versioning pattern in `db/migrations.ts`. The current target version is **v14**. Each version gate runs `ALTER TABLE` statements and bumps `PRAGMA user_version`. Fresh installs skip straight to the full schema at v0 and set `user_version = 14`.

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
- Investment portfolio with value history and chart
- Grading with explanation
- Streaks, achievements, avatar, league progression
- Multi-currency, rollover settings, onboarding

**Possible future improvements:**
- Recurring expenses (infrastructure exists via `is_recurring` column)
- iCloud / local backup / export to CSV
- Widgets (Expo Widget extension)
- Notification reminders
- Multi-hop rollover cascade for past-month corrections
- App Store distribution

---

## Local data note

BullBudget stores everything in an SQLite database on your device. There is no backend, no account, and no network calls except for CoinGecko crypto price lookups (optional, used only on the Savings tab).

Uninstalling the app will erase all data. Back up your device regularly if this data matters to you.
