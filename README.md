# BullBudget

A focused personal finance app for iPhone. Allocate your income into three buckets — **Must**, **Want**, and **Invest** — then track every spend and watch your portfolio grow.

---

## What it does

Most budgeting apps are overwhelming. BullBudget does one thing well: it forces a clear monthly decision upfront (how much goes where?), then stays out of your way while you track it.

- Log an expense in seconds, with auto-classification into Must or Want
- See your remaining budget at a glance from the home dashboard
- Track investments manually — stocks, ETFs, crypto, real estate, savings
- Close each month, carry rollovers forward, and start fresh

---

## Key features

| Feature | Details |
|---|---|
| Must / Want / Invest split | Set percentages once at onboarding, adjust anytime |
| Monthly budget cycle | Income-based, rolls over unspent balances per your rules |
| Expense tracking | Auto-suggested bucket, markable as investment |
| Investment portfolio | Manual tracking with full value history and line chart |
| Crypto support | CoinGecko live price refresh for tracked coins |
| Budget grading | A–F grade based on Must and Want adherence |
| Rollover settings | Per-bucket rules: move surplus to Invest, Want, or Must |
| Profile & streaks | Avatar, achievements, daily streak tracking |
| Multi-currency | ILS, USD, EUR throughout |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native via Expo SDK 54 |
| Routing | Expo Router (file-based) |
| Database | SQLite via `expo-sqlite` with versioned migrations |
| Language | TypeScript |
| State | React hooks — no external state library |
| Charts | Custom SVG line chart via `react-native-svg` |
| Icons | Ionicons (`@expo/vector-icons`) |
| Crypto prices | CoinGecko public API |

---

## Running locally

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start
```

Open the app in Expo Go (scan the QR code) or in an iOS/Android simulator.

> **Note:** The app targets iPhone first. Most UI decisions and safe area handling are iOS-optimised.

---

## Architecture overview

```
app/
  (tabs)/           # Main tab screens: home, savings, history, profile, settings
  investment/       # Investment detail (dynamic route)
  onboarding.tsx    # 3-step onboarding wizard
  expense-new.tsx   # Add expense modal
  investment-*.tsx  # Investment create / edit / update screens

components/         # Shared UI: AppScreen, InvestmentForm, InvestmentLineChart, avatars

db/                 # All SQLite logic, one file per domain
  migrations.ts     # Versioned schema migrations (current: v14)
  home.ts           # Home dashboard query
  months.ts         # Month lifecycle: create, close, rollover
  expenses.ts       # Expense CRUD
  investments.ts    # Investment CRUD
  investment-detail.ts  # Detail view + value updates
  settings.ts       # App settings: currency, rollover rules
  profile.ts        # User profile
  achievements.ts   # Achievement unlock logic
  avatar.ts         # Avatar configuration

lib/
  money.ts          # Parse and format cents ↔ display strings
  date.ts           # Date formatting and month key utilities
  grade.ts          # A–F budget grade calculation
  coins.ts          # CoinGecko coin search
  expenseClassifier.ts  # Suggest Must vs Want for new expenses

theme/
  colors.ts         # Single source of truth for the colour palette
```

**Data model key points:**
- All monetary values are stored as integer cents to avoid floating-point issues
- Monthly budget state lives in the `months` table; expenses are tied to a `month_id`
- Investments live independently in `savings_items`; value history is in `savings_updates`
- App settings (currency, rollover targets, split defaults) are a single row in `app_settings`

---

## Database migrations

Schema changes use a linear versioning pattern in `db/migrations.ts`. The current target version is **v14**. Each version gate is a separate `if` block that runs `ALTER TABLE` statements and bumps `PRAGMA user_version`.

Fresh installs skip straight to v0 (full schema creation) and set `user_version = 14`.
