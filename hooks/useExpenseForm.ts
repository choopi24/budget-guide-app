import { useEffect, useMemo, useState } from 'react';
import { useExpensesDb } from '../db/expenses';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { ESSENTIALS, LIFESTYLE, type Category } from '../lib/expenseCategories';
import { detectExpenseBucket, type ExpenseBucket } from '../lib/expenseClassifier';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

// ── Session-persistent smart defaults ────────────────────────────────────────
// Module-level so they survive unmount/remount within the same JS session.
let _lastCategory: string | null = null;
let _lastBucket: ExpenseBucket = 'want';

export function useExpenseForm(options: { onSaved: () => void }) {
  const { addExpense } = useExpensesDb();
  const { getCurrency } = useSettingsDb();

  const [currency,    setCurrency]    = useState<SupportedCurrency>('ILS');
  const [selected,    setSelected]    = useState<string | null>(_lastCategory);
  const [customTitle, setCustomTitle] = useState('');
  const [amount,      setAmount]      = useState('');
  const [note,        setNote]        = useState('');
  const [bucket,      setBucket]      = useState<ExpenseBucket>(_lastBucket);
  const [saving,      setSaving]      = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showNote,    setShowNote]    = useState(false);

  useEffect(() => { getCurrency().then(setCurrency); }, [getCurrency]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isCustom    = selected === 'custom';
  const title       = isCustom ? customTitle : (selected ?? '');
  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);
  const canSave     = title.trim().length > 0 && amountCents > 0 && !saving;

  const visibleChips = bucket === 'must' ? ESSENTIALS : LIFESTYLE;
  const bucketColor  = bucket === 'must' ? colors.must     : colors.want;
  const bucketSoft   = bucket === 'must' ? colors.mustSoft : colors.wantSoft;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBucketChange(newBucket: ExpenseBucket) {
    hapticLight();
    setBucket(newBucket);
    _lastBucket = newBucket;
    if (selected && selected !== 'custom') {
      const wasEssential = ESSENTIALS.some(c => c.label === selected);
      const wasLifestyle = LIFESTYLE.some(c => c.label === selected);
      if (newBucket === 'must' && wasLifestyle) setSelected(null);
      if (newBucket === 'want' && wasEssential) setSelected(null);
    }
  }

  function pickCategory(cat: Category) {
    hapticLight();
    setSelected(cat.label);
    setBucket(cat.bucket);
    _lastCategory = cat.label;
    _lastBucket   = cat.bucket;
  }

  // The screen passes a focus callback so the hook stays ref-free.
  function pickCustom(focusCustomInput: () => void) {
    hapticLight();
    setSelected('custom');
    _lastCategory = 'custom';
    setTimeout(focusCustomInput, 50);
  }

  function handleCustomTitleChange(text: string) {
    setCustomTitle(text);
    setBucket(detectExpenseBucket(text));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await addExpense({
        title: title.trim(),
        amountCents,
        spentOn: new Date().toISOString(),
        note,
        finalBucket: bucket,
        isRecurring,
      });
      hapticSuccess();
      options.onSaved();
    } finally {
      setSaving(false);
    }
  }

  return {
    // Raw state needed by inputs
    currency, selected, customTitle, amount, setAmount,
    note, setNote, bucket, saving, isRecurring, setIsRecurring,
    showNote, setShowNote,
    // Derived
    isCustom, title, amountCents, canSave,
    visibleChips, bucketColor, bucketSoft,
    // Handlers
    handleBucketChange, pickCategory, pickCustom,
    handleCustomTitleChange, handleSave,
  };
}
