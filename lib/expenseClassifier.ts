export type ExpenseBucket = 'must' | 'want';

const MUST_KEYWORDS = [
  'rent',
  'mortgage',
  'groceries',
  'supermarket',
  'electric',
  'water',
  'gas',
  'internet',
  'phone',
  'insurance',
  'doctor',
  'medicine',
  'pharmacy',
  'fuel',
  'gasoline',
  'transport',
  'bus',
  'train',
  'tax',
  'school',
  'childcare',
  'parking',
];

export function detectExpenseBucket(title: string): ExpenseBucket {
  const normalized = title.trim().toLowerCase();

  if (!normalized) return 'want';

  const isMust = MUST_KEYWORDS.some((word) => normalized.includes(word));

  return isMust ? 'must' : 'want';
}