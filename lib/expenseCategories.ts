import { type ExpenseBucket } from './expenseClassifier';

export type Category = { label: string; emoji: string; bucket: ExpenseBucket };

export const MUST_CATEGORIES: Category[] = [
  { label: 'Rent / Mortgage',      emoji: '🏠', bucket: 'must' },
  { label: 'Groceries',            emoji: '🛒', bucket: 'must' },
  { label: 'Utilities',            emoji: '⚡', bucket: 'must' },
  { label: 'Transport',            emoji: '🚌', bucket: 'must' },
  { label: 'Health',               emoji: '🏥', bucket: 'must' },
  { label: 'Insurance',            emoji: '🛡️', bucket: 'must' },
  { label: 'Phone / Internet',     emoji: '📱', bucket: 'must' },
  { label: 'Debt',                 emoji: '💳', bucket: 'must' },
  { label: 'Education / Childcare',emoji: '📚', bucket: 'must' },
  { label: 'Bank Fees',            emoji: '🏦', bucket: 'must' },
  { label: 'Other Must',           emoji: '📋', bucket: 'must' },
];

export const WANT_CATEGORIES: Category[] = [
  { label: 'Restaurants',   emoji: '🍽️', bucket: 'want' },
  { label: 'Coffee',        emoji: '☕',  bucket: 'want' },
  { label: 'Delivery',      emoji: '🥡', bucket: 'want' },
  { label: 'Shopping',      emoji: '🛍️', bucket: 'want' },
  { label: 'Entertainment', emoji: '🎬', bucket: 'want' },
  { label: 'Travel',        emoji: '✈️', bucket: 'want' },
  { label: 'Fitness',       emoji: '💪', bucket: 'want' },
  { label: 'Subscriptions', emoji: '📺', bucket: 'want' },
  { label: 'Personal Care', emoji: '💇', bucket: 'want' },
  { label: 'Gifts',         emoji: '🎁', bucket: 'want' },
  { label: 'Hobbies',       emoji: '🎯', bucket: 'want' },
  { label: 'Other Want',    emoji: '📋', bucket: 'want' },
];

