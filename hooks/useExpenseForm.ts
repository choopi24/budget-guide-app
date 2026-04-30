import { useEffect, useMemo, useState } from 'react';
import { useRecurringDb } from '../db/recurring';
import { useExpensesDb } from '../db/expenses';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { MUST_CATEGORIES, WANT_CATEGORIES, type Category } from '../lib/expenseCategories';
import { classifyExpenseInput, type ExpenseBucket } from '../lib/expenseClassifier';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

// ── Session-persistent smart defaults ────────────────────────────────────────
let _lastCategory: string | null = null;
let _lastBucket: ExpenseBucket = 'want';

export function useExpenseForm(options: { onSaved: () => void }) {
  const { addExpense } = useExpensesDb();
  const { createFromExpense } = useRecurringDb();
  const { getCurrency } = useSettingsDb();

  const [currency,    setCurrency]    = useState<SupportedCurrency>('ILS');
  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState<string | null>(_lastCategory);
  const [amount,      setAmount]      = useState('');
  const [note,        setNote]        = useState('');
  const [bucket,      setBucket]      = useState<ExpenseBucket>(_lastBucket);
  const [spentOn,     setSpentOn]     = useState<Date>(() => new Date());
  const [saving,          setSaving]          = useState(false);
  const [isRecurring,     setIsRecurring]     = useState(false);
  const [showNote,        setShowNote]        = useState(false);
  const [categoryLocked,  setCategoryLocked]  = useState(false);

  useEffect(() => { getCurrency().then(setCurrency); }, [getCurrency]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const amountCents         = useMemo(() => parseMoneyToCents(amount), [amount]);
  const canSave             = title.trim().length > 0 && amountCents > 0 && !saving;
  const recurringDayOfMonth = new Date().getDate();

  const visibleChips = bucket === 'must' ? MUST_CATEGORIES : WANT_CATEGORIES;
  const bucketColor  = bucket === 'must' ? colors.must     : colors.want;
  const bucketSoft   = bucket === 'must' ? colors.mustSoft : colors.wantSoft;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBucketChange(newBucket: ExpenseBucket) {
    hapticLight();
    setBucket(newBucket);
    _lastBucket = newBucket;
    if (category) {
      const inMust = MUST_CATEGORIES.some(c => c.label === category);
      const inWant = WANT_CATEGORIES.some(c => c.label === category);
      if ((newBucket === 'must' && inWant) || (newBucket === 'want' && inMust)) {
        setCategory(null);
        setCategoryLocked(false);
        _lastCategory = null;
      }
    }
  }

  function pickCategory(cat: Category) {
    hapticLight();
    setCategory(cat.label);
    setBucket(cat.bucket);
    setCategoryLocked(true);
    _lastCategory = cat.label;
    _lastBucket   = cat.bucket;
  }

  function clearCategory() {
    hapticLight();
    setCategory(null);
    setCategoryLocked(false);
    _lastCategory = null;
  }

  function handleTitleChange(text: string) {
    setTitle(text);
    if (categoryLocked) return;
    const result = classifyExpenseInput(text);
    setBucket(result.bucket);
    if (result.category !== null) {
      setCategory(result.category);
    } else {
      setCategory(null);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const isoDate = spentOn.toISOString();
      const { expenseId } = await addExpense({
        title: title.trim(),
        amountCents,
        spentOn: isoDate,
        note,
        finalBucket: bucket,
        isRecurring,
        category: category ?? undefined,
      });
      if (isRecurring) {
        await createFromExpense({
          expenseId,
          title: title.trim(),
          amountCents,
          bucket,
          dayOfMonth: recurringDayOfMonth,
        });
      }
      hapticSuccess();
      options.onSaved();
    } finally {
      setSaving(false);
    }
  }

  return {
    // State
    currency, title, setTitle: handleTitleChange, category, amount, setAmount,
    note, setNote, bucket, spentOn, setSpentOn, saving,
    isRecurring, setIsRecurring, showNote, setShowNote,
    // Derived
    amountCents, canSave, recurringDayOfMonth,
    visibleChips, bucketColor, bucketSoft,
    // Handlers
    handleBucketChange, pickCategory, clearCategory, handleSave,
  };
}
