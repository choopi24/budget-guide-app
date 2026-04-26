/**
 * Receipt-specific Must/Want bucket classification.
 *
 * Uses merchant names, extracted line items, and receipt text — separately
 * and in combination — to produce a more accurate suggestion than the
 * generic keyword classifier in lib/expenseClassifier.ts.
 *
 * Claude's `categorySuggestion` is used as a weighted tiebreak when the
 * local patterns produce no clear winner.
 */

// ── Must patterns ─────────────────────────────────────────────────────────────

// Merchant-level (double weight). Partial, case-insensitive.
const MUST_MERCHANT: string[] = [
  // Israeli supermarkets / mini-markets
  'shufersal', 'שופרסל', 'rami levi', 'רמי לוי', 'mega', 'מגה',
  'victory', 'ויקטורי', 'tiv taam', 'yochananof', 'יוחננוף',
  'osher ad', 'am:pm', 'ampm', 'makolet', 'מכולת',
  // Global supermarkets / food retail
  'supermarket', 'super market', 'grocery', 'food market', 'food store',
  'tesco', "sainsbury", "sainsbury's", 'waitrose', 'asda', 'morrison',
  'aldi', 'lidl', 'rewe', 'edeka', 'kaufland', 'netto',
  'whole foods', 'trader joe', 'walmart', 'costco', 'kroger',
  'safeway', 'publix', 'meijer', 'stop & shop', 'giant',
  'carrefour', 'leclerc', 'intermarché',
  // Israeli pharmacies
  'super-pharm', 'super pharm', 'superpharm', 'goodpharm', 'teva',
  // Global pharmacies
  'pharmacy', 'farmacia', 'apotheke', 'apotheek', 'apotek',
  'cvs', 'walgreens', 'boots', 'rite aid', 'lloyds',
  // Israeli fuel
  'sonol', 'delek', 'paz', 'ten petroleum',
  // Global fuel
  'shell', 'bp ', 'esso', 'total ', 'texaco', 'chevron',
  'petrol', 'gas station', 'gasoline', 'fuel station',
  // Israeli telecom / utilities
  'bezeq', 'בזק', 'cellcom', 'סלקום', 'partner', 'פרטנר',
  'hot ', 'הוט', 'golan', 'גולן',
  // Global utilities / telecom
  'electric company', 'water authority', 'municipality',
  'internet provider', 'telecom',
  // Public transport
  'rav kav', 'רב-קו', 'egged', 'אגד', 'metro ', 'tube ',
  'rail ', 'subway ', 'transit', 'מוניות', 'taxi',
  // Medical
  'hospital', 'clinic', 'medical center', 'medical centre',
  'doctor', 'dental', 'dentist', 'optician', 'optometrist',
  // Insurance
  'insurance', 'ביטוח', 'assurance',
  // Childcare / education
  'daycare', 'day care', 'nursery', 'school', 'university',
];

// Item-level keywords that suggest Must
const MUST_ITEMS: string[] = [
  'bread', 'milk', 'egg', 'eggs', 'chicken', 'beef', 'fish', 'pork',
  'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'butter',
  'vegetable', 'fruit', 'produce', 'dairy', 'cheese', 'yogurt',
  'toilet paper', 'toilet roll', 'tissues', 'paper towel',
  'detergent', 'washing powder', 'dish soap', 'bleach', 'cleaning',
  'soap', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush',
  'deodorant', 'razor', 'sanitary',
  'medication', 'medicine', 'prescription', 'vitamin', 'supplement',
  'baby food', 'infant formula', 'diaper', 'nappy', 'wipe',
  'fuel', 'petrol', 'gas',
];

// ── Want patterns ─────────────────────────────────────────────────────────────

const WANT_MERCHANT: string[] = [
  // Restaurants & fast food
  'restaurant', 'steakhouse', 'grill ', 'bistro', 'brasserie',
  'mcdonald', "mcd'", 'burger king', 'wendy', 'kfc', 'subway ',
  'domino', 'pizza', 'sushi', 'noodle', 'ramen', 'poke', 'shawarma',
  'falafel', 'hummus',
  // Cafes & coffee
  'cafe ', 'café', 'coffee', 'espresso', 'aroma ', 'arcaffe', 'greg ',
  'starbucks', 'costa ', 'nero', 'pret ',
  // Bars & alcohol
  'bar ', 'pub ', 'brewery', 'taproom', 'cocktail', 'wine bar',
  // Entertainment
  'cinema', 'movie', 'theater', 'theatre', 'imax', 'concert',
  'bowling', 'escape room', 'museum', 'zoo', 'amusement', 'arcade',
  'netflix', 'spotify', 'steam ',
  // Fashion & clothing
  'zara', 'h&m', 'gap ', 'uniqlo', 'forever 21', 'mango ', 'topshop',
  'primark', 'asos', 'shein', 'renuar', 'golf ',
  'clothing', 'fashion', 'boutique', 'apparel',
  // Footwear
  'nike ', 'adidas ', 'reebok', 'new balance', 'converse', 'vans ',
  'timberland', 'shoes', 'sneakers', 'footwear',
  // Electronics & tech
  'apple store', 'istore', 'best buy', 'media markt',
  'samsung', 'gaming', 'playstation', 'xbox',
  // Beauty & personal care (discretionary)
  'hair salon', 'hair studio', 'nail ', 'spa ', 'massage',
  'beauty salon', 'barber',
  // Fitness (discretionary)
  'gym ', 'fitness ', 'pilates', 'yoga ', 'crossfit',
  // Online shopping
  'amazon ', 'aliexpress', 'ebay ',
  // Hotels & travel (non-essential)
  'hotel ', 'airbnb', 'hostel', 'resort',
];

const WANT_ITEMS: string[] = [
  'wine', 'beer', 'alcohol', 'whisky', 'whiskey', 'vodka',
  'cocktail', 'spirits', 'champagne',
  'candy', 'chocolate', 'snack', 'chips', 'crisp', 'soda',
  'energy drink', 'soft drink',
  'cigarette', 'tobacco', 'vape',
  'shirt', 'pants', 'dress', 'jacket', 'coat', 'sneakers',
  'toy', 'game ', 'accessory', 'decoration',
  'coffee cup', 'latte', 'cappuccino', 'americano',
];

// ── Public API ────────────────────────────────────────────────────────────────

type ClassifyInput = {
  merchant?: string;
  items?: string[];
  rawText?: string;
  claudeSuggestion?: 'must' | 'want';
};

export function classifyReceiptBucket(input: ClassifyInput): 'must' | 'want' {
  const { merchant, items, rawText, claudeSuggestion } = input;

  const merchantLow = (merchant ?? '').toLowerCase();
  const itemsCorpus = (items ?? []).map((i) => i.toLowerCase()).join(' ');
  const fullCorpus  = [merchantLow, itemsCorpus, (rawText ?? '').toLowerCase()].join(' ');

  if (!fullCorpus.trim()) return claudeSuggestion ?? 'want';

  let mustScore = 0;
  let wantScore = 0;

  // Merchant patterns — double weight (most reliable signal)
  for (const p of MUST_MERCHANT) { if (merchantLow.includes(p)) mustScore += 2; }
  for (const p of WANT_MERCHANT) { if (merchantLow.includes(p)) wantScore += 2; }

  // Item/text patterns — single weight
  for (const p of MUST_ITEMS) { if (itemsCorpus.includes(p) || fullCorpus.includes(p)) mustScore += 1; }
  for (const p of WANT_ITEMS) { if (itemsCorpus.includes(p) || fullCorpus.includes(p)) wantScore += 1; }

  // Claude's suggestion is a soft +1 tiebreak
  if (claudeSuggestion === 'must') mustScore += 1;
  if (claudeSuggestion === 'want') wantScore += 1;

  if (mustScore > wantScore) return 'must';
  if (wantScore > mustScore) return 'want';

  // Pure tie: prefer Claude's suggestion, then 'want'
  return claudeSuggestion ?? 'want';
}
