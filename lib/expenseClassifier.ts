export type ExpenseBucket = 'must' | 'want';

export type ClassificationResult = {
  bucket: ExpenseBucket;
  /** Exact label from MUST_CATEGORIES or WANT_CATEGORIES, or null if unknown. */
  category: string | null;
};

// ── Merchant → category rules ─────────────────────────────────────────────────
// Patterns are matched as case-insensitive substrings of the normalised title.
// Order matters: first match wins. Put more-specific patterns before less-specific ones.

type MerchantRule = { pattern: string; category: string; bucket: ExpenseBucket };

const MERCHANT_RULES: MerchantRule[] = [
  // ── Groceries ──────────────────────────────────────────────────────────────
  { pattern: 'shufersal',     category: 'Groceries', bucket: 'must' },
  { pattern: 'שופרסל',        category: 'Groceries', bucket: 'must' },
  { pattern: 'rami levi',     category: 'Groceries', bucket: 'must' },
  { pattern: 'רמי לוי',       category: 'Groceries', bucket: 'must' },
  { pattern: 'yochananof',    category: 'Groceries', bucket: 'must' },
  { pattern: 'יוחננוף',      category: 'Groceries', bucket: 'must' },
  { pattern: 'osher ad',      category: 'Groceries', bucket: 'must' },
  { pattern: 'tiv taam',      category: 'Groceries', bucket: 'must' },
  { pattern: 'mega market',   category: 'Groceries', bucket: 'must' },
  { pattern: 'victory market',category: 'Groceries', bucket: 'must' },
  { pattern: 'ויקטורי',       category: 'Groceries', bucket: 'must' },
  { pattern: 'am:pm',         category: 'Groceries', bucket: 'must' },
  { pattern: 'ampm store',    category: 'Groceries', bucket: 'must' },
  { pattern: 'whole foods',   category: 'Groceries', bucket: 'must' },
  { pattern: 'trader joe',    category: 'Groceries', bucket: 'must' },
  { pattern: 'tesco',         category: 'Groceries', bucket: 'must' },
  { pattern: 'sainsbury',     category: 'Groceries', bucket: 'must' },
  { pattern: 'waitrose',      category: 'Groceries', bucket: 'must' },
  { pattern: 'asda',          category: 'Groceries', bucket: 'must' },
  { pattern: 'morrison',      category: 'Groceries', bucket: 'must' },
  { pattern: 'aldi',          category: 'Groceries', bucket: 'must' },
  { pattern: 'lidl',          category: 'Groceries', bucket: 'must' },
  { pattern: 'rewe',          category: 'Groceries', bucket: 'must' },
  { pattern: 'edeka',         category: 'Groceries', bucket: 'must' },
  { pattern: 'walmart',       category: 'Groceries', bucket: 'must' },
  { pattern: 'costco',        category: 'Groceries', bucket: 'must' },
  { pattern: 'carrefour',     category: 'Groceries', bucket: 'must' },
  { pattern: 'leclerc',       category: 'Groceries', bucket: 'must' },
  { pattern: 'kroger',        category: 'Groceries', bucket: 'must' },
  { pattern: 'safeway',       category: 'Groceries', bucket: 'must' },
  { pattern: 'publix',        category: 'Groceries', bucket: 'must' },

  // ── Health ─────────────────────────────────────────────────────────────────
  // More-specific patterns before 'pharmacy' (single word)
  { pattern: 'super-pharm',   category: 'Health', bucket: 'must' },
  { pattern: 'super pharm',   category: 'Health', bucket: 'must' },
  { pattern: 'superpharm',    category: 'Health', bucket: 'must' },
  { pattern: 'goodpharm',     category: 'Health', bucket: 'must' },
  { pattern: 'walgreens',     category: 'Health', bucket: 'must' },
  { pattern: 'cvs pharmacy',  category: 'Health', bucket: 'must' },
  { pattern: 'boots pharmacy',category: 'Health', bucket: 'must' },
  { pattern: 'lloyds pharmacy',category:'Health', bucket: 'must' },
  { pattern: 'maccabi',       category: 'Health', bucket: 'must' },
  { pattern: 'clalit',        category: 'Health', bucket: 'must' },
  { pattern: 'meuhedet',      category: 'Health', bucket: 'must' },
  { pattern: 'leumit',        category: 'Health', bucket: 'must' },
  { pattern: 'ichilov',       category: 'Health', bucket: 'must' },
  { pattern: 'hadassah',      category: 'Health', bucket: 'must' },

  // ── Transport ──────────────────────────────────────────────────────────────
  { pattern: 'gett',          category: 'Transport', bucket: 'must' },
  { pattern: 'uber',          category: 'Transport', bucket: 'must' },
  { pattern: 'lyft',          category: 'Transport', bucket: 'must' },
  { pattern: 'free now',      category: 'Transport', bucket: 'must' },
  { pattern: 'bolt ride',     category: 'Transport', bucket: 'must' },
  { pattern: 'yango',         category: 'Transport', bucket: 'must' },
  { pattern: 'waze carpool',  category: 'Transport', bucket: 'must' },
  { pattern: 'rav kav',       category: 'Transport', bucket: 'must' },
  { pattern: 'רב-קו',         category: 'Transport', bucket: 'must' },
  { pattern: 'egged',         category: 'Transport', bucket: 'must' },
  { pattern: 'אגד',           category: 'Transport', bucket: 'must' },
  { pattern: 'moovit',        category: 'Transport', bucket: 'must' },
  { pattern: 'sonol',         category: 'Transport', bucket: 'must' },
  { pattern: 'delek fuel',    category: 'Transport', bucket: 'must' },
  { pattern: 'paz fuel',      category: 'Transport', bucket: 'must' },
  { pattern: 'ten petroleum', category: 'Transport', bucket: 'must' },
  { pattern: 'shell station', category: 'Transport', bucket: 'must' },
  { pattern: 'bp station',    category: 'Transport', bucket: 'must' },
  { pattern: 'esso',          category: 'Transport', bucket: 'must' },

  // ── Phone / Internet ───────────────────────────────────────────────────────
  { pattern: 'bezeq',         category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'בזק',           category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'cellcom',       category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'סלקום',         category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'partner comm',  category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'פרטנר',         category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'hot mobile',    category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'hot telecom',   category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'golan telecom', category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'גולן טלקום',    category: 'Phone / Internet', bucket: 'must' },
  { pattern: 'yes tv',        category: 'Phone / Internet', bucket: 'must' },

  // ── Insurance ──────────────────────────────────────────────────────────────
  { pattern: 'harel insurance',  category: 'Insurance', bucket: 'must' },
  { pattern: 'migdal insurance', category: 'Insurance', bucket: 'must' },
  { pattern: 'clal insurance',   category: 'Insurance', bucket: 'must' },
  { pattern: 'phoenix insurance',category: 'Insurance', bucket: 'must' },
  { pattern: 'menora insurance', category: 'Insurance', bucket: 'must' },
  { pattern: 'ayalon insurance', category: 'Insurance', bucket: 'must' },
  { pattern: 'direct insurance', category: 'Insurance', bucket: 'must' },

  // ── Education / Childcare ──────────────────────────────────────────────────
  { pattern: 'coursera',      category: 'Education / Childcare', bucket: 'must' },
  { pattern: 'udemy',         category: 'Education / Childcare', bucket: 'must' },
  { pattern: 'masterclass',   category: 'Education / Childcare', bucket: 'must' },
  { pattern: 'pluralsight',   category: 'Education / Childcare', bucket: 'must' },

  // ── Bank Fees ──────────────────────────────────────────────────────────────
  { pattern: 'bank hapoalim', category: 'Bank Fees', bucket: 'must' },
  { pattern: 'bank leumi',    category: 'Bank Fees', bucket: 'must' },
  { pattern: 'bank discount', category: 'Bank Fees', bucket: 'must' },
  { pattern: 'mizrahi tefahot',category:'Bank Fees', bucket: 'must' },
  { pattern: 'fibi bank',     category: 'Bank Fees', bucket: 'must' },
  { pattern: 'bank of america',category:'Bank Fees', bucket: 'must' },
  { pattern: 'barclays',      category: 'Bank Fees', bucket: 'must' },
  { pattern: 'hsbc',          category: 'Bank Fees', bucket: 'must' },
  { pattern: 'chase bank',    category: 'Bank Fees', bucket: 'must' },
  { pattern: 'wells fargo',   category: 'Bank Fees', bucket: 'must' },

  // ── Coffee ─────────────────────────────────────────────────────────────────
  // Before generic patterns like 'coffee'
  { pattern: 'aroma',         category: 'Coffee', bucket: 'want' },
  { pattern: 'ארומה',         category: 'Coffee', bucket: 'want' },
  { pattern: 'arcaffe',       category: 'Coffee', bucket: 'want' },
  { pattern: 'greg cafe',     category: 'Coffee', bucket: 'want' },
  { pattern: 'starbucks',     category: 'Coffee', bucket: 'want' },
  { pattern: 'costa coffee',  category: 'Coffee', bucket: 'want' },
  { pattern: 'caffe nero',    category: 'Coffee', bucket: 'want' },
  { pattern: 'pret a manger', category: 'Coffee', bucket: 'want' },
  { pattern: 'coffee bean',   category: 'Coffee', bucket: 'want' },
  { pattern: 'tim hortons',   category: 'Coffee', bucket: 'want' },
  { pattern: 'dunkin',        category: 'Coffee', bucket: 'want' },
  { pattern: 'blue bottle',   category: 'Coffee', bucket: 'want' },

  // ── Delivery ───────────────────────────────────────────────────────────────
  // Before restaurant names (Wolt/10bis carry restaurant orders)
  { pattern: 'wolt',          category: 'Delivery', bucket: 'want' },
  { pattern: 'וולט',          category: 'Delivery', bucket: 'want' },
  { pattern: '10bis',         category: 'Delivery', bucket: 'want' },
  { pattern: 'mishloha',      category: 'Delivery', bucket: 'want' },
  { pattern: 'just eat',      category: 'Delivery', bucket: 'want' },
  { pattern: 'deliveroo',     category: 'Delivery', bucket: 'want' },
  { pattern: 'uber eats',     category: 'Delivery', bucket: 'want' },
  { pattern: 'doordash',      category: 'Delivery', bucket: 'want' },
  { pattern: 'grubhub',       category: 'Delivery', bucket: 'want' },
  { pattern: 'foodpanda',     category: 'Delivery', bucket: 'want' },
  { pattern: 'menulog',       category: 'Delivery', bucket: 'want' },

  // ── Restaurants ────────────────────────────────────────────────────────────
  { pattern: 'mcdonald',      category: 'Restaurants', bucket: 'want' },
  { pattern: 'burger king',   category: 'Restaurants', bucket: 'want' },
  { pattern: 'kfc',           category: 'Restaurants', bucket: 'want' },
  { pattern: 'subway restaurant', category: 'Restaurants', bucket: 'want' },
  { pattern: 'dominos',       category: 'Restaurants', bucket: 'want' },
  { pattern: 'pizza hut',     category: 'Restaurants', bucket: 'want' },
  { pattern: 'wendy\'s',      category: 'Restaurants', bucket: 'want' },
  { pattern: 'shake shack',   category: 'Restaurants', bucket: 'want' },
  { pattern: 'five guys',     category: 'Restaurants', bucket: 'want' },
  { pattern: 'chipotle',      category: 'Restaurants', bucket: 'want' },

  // ── Entertainment ──────────────────────────────────────────────────────────
  { pattern: 'netflix',       category: 'Entertainment', bucket: 'want' },
  { pattern: 'disney+',       category: 'Entertainment', bucket: 'want' },
  { pattern: 'disney plus',   category: 'Entertainment', bucket: 'want' },
  { pattern: 'hbo max',       category: 'Entertainment', bucket: 'want' },
  { pattern: 'apple tv+',     category: 'Entertainment', bucket: 'want' },
  { pattern: 'amazon prime',  category: 'Entertainment', bucket: 'want' },
  { pattern: 'paramount+',    category: 'Entertainment', bucket: 'want' },
  { pattern: 'yes planet',    category: 'Entertainment', bucket: 'want' },
  { pattern: 'rav hen',       category: 'Entertainment', bucket: 'want' },
  { pattern: 'cinema city',   category: 'Entertainment', bucket: 'want' },
  { pattern: 'imax',          category: 'Entertainment', bucket: 'want' },
  { pattern: 'steam games',   category: 'Entertainment', bucket: 'want' },
  { pattern: 'playstation',   category: 'Entertainment', bucket: 'want' },
  { pattern: 'xbox game',     category: 'Entertainment', bucket: 'want' },
  { pattern: 'nintendo',      category: 'Entertainment', bucket: 'want' },

  // ── Subscriptions ──────────────────────────────────────────────────────────
  { pattern: 'spotify',       category: 'Subscriptions', bucket: 'want' },
  { pattern: 'apple music',   category: 'Subscriptions', bucket: 'want' },
  { pattern: 'youtube premium',category:'Subscriptions', bucket: 'want' },
  { pattern: 'google one',    category: 'Subscriptions', bucket: 'want' },
  { pattern: 'icloud storage',category: 'Subscriptions', bucket: 'want' },
  { pattern: 'dropbox',       category: 'Subscriptions', bucket: 'want' },
  { pattern: 'microsoft 365', category: 'Subscriptions', bucket: 'want' },
  { pattern: 'adobe creative',category: 'Subscriptions', bucket: 'want' },
  { pattern: 'linkedin premium',category:'Subscriptions',bucket: 'want' },
  { pattern: 'canva pro',     category: 'Subscriptions', bucket: 'want' },
  { pattern: 'headspace',     category: 'Subscriptions', bucket: 'want' },
  { pattern: 'calm app',      category: 'Subscriptions', bucket: 'want' },
  { pattern: 'duolingo',      category: 'Subscriptions', bucket: 'want' },
  { pattern: 'deezer',        category: 'Subscriptions', bucket: 'want' },
  { pattern: 'tidal music',   category: 'Subscriptions', bucket: 'want' },
  { pattern: 'notion',        category: 'Subscriptions', bucket: 'want' },
  { pattern: '1password',     category: 'Subscriptions', bucket: 'want' },

  // ── Shopping ───────────────────────────────────────────────────────────────
  { pattern: 'amazon',        category: 'Shopping', bucket: 'want' },
  { pattern: 'aliexpress',    category: 'Shopping', bucket: 'want' },
  { pattern: 'ebay',          category: 'Shopping', bucket: 'want' },
  { pattern: 'zara',          category: 'Shopping', bucket: 'want' },
  { pattern: 'h&m',           category: 'Shopping', bucket: 'want' },
  { pattern: 'uniqlo',        category: 'Shopping', bucket: 'want' },
  { pattern: 'ikea',          category: 'Shopping', bucket: 'want' },
  { pattern: 'shein',         category: 'Shopping', bucket: 'want' },
  { pattern: 'asos',          category: 'Shopping', bucket: 'want' },
  { pattern: 'home center',   category: 'Shopping', bucket: 'want' },
  { pattern: 'renuar',        category: 'Shopping', bucket: 'want' },
  { pattern: 'golf fashion',  category: 'Shopping', bucket: 'want' },
  { pattern: 'primark',       category: 'Shopping', bucket: 'want' },
  { pattern: 'mango fashion', category: 'Shopping', bucket: 'want' },

  // ── Fitness ────────────────────────────────────────────────────────────────
  { pattern: 'holmes place',  category: 'Fitness', bucket: 'want' },
  { pattern: 'holmesplace',   category: 'Fitness', bucket: 'want' },
  { pattern: 'gold\'s gym',   category: 'Fitness', bucket: 'want' },
  { pattern: 'planet fitness',category: 'Fitness', bucket: 'want' },
  { pattern: 'anytime fitness',category:'Fitness', bucket: 'want' },
  { pattern: 'crossfit',      category: 'Fitness', bucket: 'want' },
  { pattern: 'orangetheory',  category: 'Fitness', bucket: 'want' },
  { pattern: 'f45',           category: 'Fitness', bucket: 'want' },

  // ── Personal Care ──────────────────────────────────────────────────────────
  { pattern: 'hair salon',    category: 'Personal Care', bucket: 'want' },
  { pattern: 'hair studio',   category: 'Personal Care', bucket: 'want' },
  { pattern: 'barbershop',    category: 'Personal Care', bucket: 'want' },
  { pattern: 'nail salon',    category: 'Personal Care', bucket: 'want' },
  { pattern: 'day spa',       category: 'Personal Care', bucket: 'want' },
  { pattern: 'sephora',       category: 'Personal Care', bucket: 'want' },
  { pattern: 'mac cosmetics', category: 'Personal Care', bucket: 'want' },
  { pattern: 'benefit cosmetics',category:'Personal Care',bucket: 'want' },

  // ── Travel ─────────────────────────────────────────────────────────────────
  { pattern: 'airbnb',        category: 'Travel', bucket: 'want' },
  { pattern: 'booking.com',   category: 'Travel', bucket: 'want' },
  { pattern: 'expedia',       category: 'Travel', bucket: 'want' },
  { pattern: 'agoda',         category: 'Travel', bucket: 'want' },
  { pattern: 'trivago',       category: 'Travel', bucket: 'want' },
  { pattern: 'el al',         category: 'Travel', bucket: 'want' },
  { pattern: 'easyjet',       category: 'Travel', bucket: 'want' },
  { pattern: 'ryanair',       category: 'Travel', bucket: 'want' },
  { pattern: 'wizz air',      category: 'Travel', bucket: 'want' },
  { pattern: 'british airways',category:'Travel', bucket: 'want' },
  { pattern: 'lufthansa',     category: 'Travel', bucket: 'want' },
  { pattern: 'delta air',     category: 'Travel', bucket: 'want' },
];

// ── Bucket-only keyword fallback ──────────────────────────────────────────────
// Used when no merchant rule matches. Returns a bucket with no category.

const MUST_KEYWORDS: string[] = [
  // Rent / Mortgage
  'rent', 'mortgage', 'arnona',
  // Groceries
  'groceries', 'grocery', 'supermarket', 'super market', 'makolet',
  // Utilities
  'electric', 'electricity', 'water', 'gas bill', 'utility', 'utilities',
  // Transport
  'transport', 'bus', 'train', 'metro', 'subway', 'transit', 'fuel', 'gasoline', 'petrol', 'parking',
  // Health
  'doctor', 'medicine', 'pharmacy', 'hospital', 'clinic', 'dental', 'dentist', 'health',
  // Insurance
  'insurance',
  // Phone / Internet
  'phone bill', 'internet bill', 'cellular', 'mobile plan',
  // Debt
  'debt', 'loan', 'repayment', 'credit repay',
  // Education / Childcare
  'school', 'tuition', 'childcare', 'daycare', 'kindergarten', 'education',
  // Bank Fees
  'bank fee', 'bank charge', 'atm fee', 'overdraft',
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Classifies a manually-typed title/merchant into a bucket and, when possible,
 * a specific category label (matching MUST_CATEGORIES / WANT_CATEGORIES).
 *
 * Phase 1: check MERCHANT_RULES (specific merchant → category + bucket).
 * Phase 2: keyword scan → bucket only, no category.
 *
 * Always local, always deterministic, no network required.
 */
export function classifyExpenseInput(title: string): ClassificationResult {
  const normalized = title.trim().toLowerCase();

  if (!normalized) return { bucket: 'want', category: null };

  // Phase 1 — merchant lookup
  for (const rule of MERCHANT_RULES) {
    if (normalized.includes(rule.pattern)) {
      return { bucket: rule.bucket, category: rule.category };
    }
  }

  // Phase 2 — keyword bucket fallback
  const isMust = MUST_KEYWORDS.some(kw => normalized.includes(kw));
  return { bucket: isMust ? 'must' : 'want', category: null };
}

/**
 * Lightweight bucket-only classifier used by the receipt classifier and
 * auto-shortcut flow (no category needed, just must vs want).
 */
export function detectExpenseBucket(title: string): ExpenseBucket {
  return classifyExpenseInput(title).bucket;
}
