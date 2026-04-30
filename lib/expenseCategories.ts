import { type ExpenseBucket } from './expenseClassifier';

export type Category = { label: string; emoji: string; bucket: ExpenseBucket };

export const ESSENTIALS: Category[] = [
  { label: 'Rent',      emoji: '🏠', bucket: 'must' },
  { label: 'Groceries', emoji: '🛒', bucket: 'must' },
  { label: 'Transport', emoji: '🚌', bucket: 'must' },
  { label: 'Electric',  emoji: '⚡', bucket: 'must' },
  { label: 'Internet',  emoji: '🌐', bucket: 'must' },
  { label: 'Phone',     emoji: '📱', bucket: 'must' },
  { label: 'Fuel',      emoji: '⛽', bucket: 'must' },
  { label: 'Pharmacy',  emoji: '💊', bucket: 'must' },
  { label: 'Doctor',    emoji: '🏥', bucket: 'must' },
  { label: 'Insurance', emoji: '🛡️', bucket: 'must' },
];

export const LIFESTYLE: Category[] = [
  { label: 'Restaurant', emoji: '🍽️', bucket: 'want' },
  { label: 'Coffee',     emoji: '☕',  bucket: 'want' },
  { label: 'Takeaway',   emoji: '🥡', bucket: 'want' },
  { label: 'Cinema',     emoji: '🎬', bucket: 'want' },
  { label: 'Shopping',   emoji: '🛍️', bucket: 'want' },
  { label: 'Self Care',  emoji: '💇', bucket: 'want' },
  { label: 'Travel',     emoji: '✈️', bucket: 'want' },
  { label: 'Drinks',     emoji: '🍺', bucket: 'want' },
  { label: 'Gym',        emoji: '💪', bucket: 'want' },
  { label: 'Streaming',  emoji: '📺', bucket: 'want' },
];
