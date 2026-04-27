import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../components/ui/Chip';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { useExpensesDb } from '../db/expenses';
import { detectExpenseBucket, ExpenseBucket } from '../lib/expenseClassifier';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/tokens';

// ── Currency symbol map ───────────────────────────────────────────────────────
const CURRENCY_SYMBOL: Record<SupportedCurrency, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
};

// ── Session-persistent smart defaults ────────────────────────────────────────
let _lastCategory: string | null = null;
let _lastBucket: ExpenseBucket = 'want';

// ── Category presets ─────────────────────────────────────────────────────────
type Category = { label: string; emoji: string; bucket: ExpenseBucket };

const ESSENTIALS: Category[] = [
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

const LIFESTYLE: Category[] = [
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const amountRef      = useRef<TextInput>(null);
  const customTitleRef = useRef<TextInput>(null);
  const noteRef        = useRef<TextInput>(null);

  const isCustom    = selected === 'custom';
  const title       = isCustom ? customTitle : (selected ?? '');
  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);
  const canSave     = title.trim().length > 0 && amountCents > 0 && !saving;

  const visibleChips = bucket === 'must' ? ESSENTIALS : LIFESTYLE;
  const bucketColor  = bucket === 'must' ? colors.must      : colors.want;
  const bucketSoft   = bucket === 'must' ? colors.mustSoft  : colors.wantSoft;

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

  function pickCustom() {
    hapticLight();
    setSelected('custom');
    _lastCategory = 'custom';
    setTimeout(() => customTitleRef.current?.focus(), 50);
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
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  }

  const ctaBg    = canSave ? bucketColor        : colors.buttonDisabled;
  const ctaColor = canSave ? colors.background  : colors.textMuted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => pressed && styles.cancelPressed}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {/* ── Amount hero ── */}
          <View style={styles.amountHero}>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyGlyph}>
                {CURRENCY_SYMBOL[currency]}
              </Text>
              <TextInput
                ref={amountRef}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.border}
                keyboardType="decimal-pad"
                returnKeyType="done"
                style={styles.amountInput}
                autoFocus
                accessibilityLabel="Amount"
              />
            </View>
          </View>

          {/* ── Bucket toggle ── */}
          <View style={styles.bucketRow}>
            {(['must', 'want'] as ExpenseBucket[]).map(b => {
              const isActive = bucket === b;
              const bColor   = b === 'must' ? colors.must     : colors.want;
              const bSoft    = b === 'must' ? colors.mustSoft : colors.wantSoft;
              return (
                <Pressable
                  key={b}
                  onPress={() => handleBucketChange(b)}
                  style={[
                    styles.bucketBtn,
                    isActive && { backgroundColor: bSoft, borderColor: bColor + '60' },
                  ]}
                >
                  <View style={[
                    styles.bucketDot,
                    { backgroundColor: bColor, opacity: isActive ? 1 : 0.35 },
                  ]} />
                  <Text style={[styles.bucketLabel, isActive && { color: bColor }]}>
                    {b === 'must' ? 'Must' : 'Want'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Category chips ── */}
          <View style={styles.chipsSection}>
            <Text style={styles.sectionCap}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {visibleChips.map(cat => (
                <Chip
                  key={cat.label}
                  label={cat.label}
                  emoji={cat.emoji}
                  active={selected === cat.label}
                  activeColor={bucketColor}
                  activeBgColor={bucketSoft}
                  onPress={() => pickCategory(cat)}
                />
              ))}
              <Chip
                label="Custom"
                emoji="✏️"
                active={isCustom}
                activeColor={colors.primary}
                activeBgColor={colors.surfaceSoft}
                onPress={pickCustom}
                accessibilityLabel="Custom category"
              />
            </ScrollView>
          </View>

          {/* ── Custom title ── */}
          {isCustom && (
            <View style={styles.fieldSection}>
              <Text style={styles.sectionCap}>What was it for?</Text>
              <TextInput
                ref={customTitleRef}
                value={customTitle}
                onChangeText={(text: string) => {
                  setCustomTitle(text);
                  setBucket(detectExpenseBucket(text));
                }}
                placeholder="Birthday gift, parking fine…"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                onSubmitEditing={() => { if (showNote) noteRef.current?.focus(); }}
                blurOnSubmit={false}
                style={styles.fieldInput}
                accessibilityLabel="Custom expense description"
              />
            </View>
          )}

          {/* ── Note ── */}
          {showNote ? (
            <View style={styles.fieldSection}>
              <Text style={styles.sectionCap}>Note</Text>
              <TextInput
                ref={noteRef}
                value={note}
                onChangeText={setNote}
                placeholder="Optional note…"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[styles.fieldInput, styles.noteInput]}
                accessibilityLabel="Note"
              />
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setShowNote(true);
                setTimeout(() => noteRef.current?.focus(), 50);
              }}
              style={styles.addNotePressable}
              hitSlop={8}
            >
              <Text style={styles.addNoteText}>＋ Add a note</Text>
            </Pressable>
          )}

          {/* ── Recurring ── */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextBlock}>
              <Text style={styles.switchLabel}>Recurring</Text>
              <Text style={styles.switchHint}>Repeats monthly</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: colors.switchTrackOn }}
              thumbColor={isRecurring ? colors.primary : colors.white}
              accessibilityLabel="Mark as recurring"
            />
          </View>
        </ScrollView>

        {/* ── Live CTA ── */}
        <View style={[styles.ctaWrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: ctaBg },
              pressed && canSave && styles.ctaPressed,
            ]}
          >
            <Text style={[styles.ctaLabel, { color: ctaColor }]}>
              {saving
                ? 'Saving…'
                : amountCents > 0
                  ? `Save · ${formatCentsToMoney(amountCents, currency)} to ${bucket === 'must' ? 'Must' : 'Want'}`
                  : `Save to ${bucket === 'must' ? 'Must' : 'Want'}`}
            </Text>
            {!saving && canSave && (
              <Text style={[styles.ctaArrow, { color: ctaColor }]}>→</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex:   { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
  },
  cancelPressed: { opacity: 0.5 },

  // ── Amount hero ───────────────────────────────────────────────────────────
  amountHero: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  currencyGlyph: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: -1.5,
    includeFontPadding: false,
    paddingBottom: 9,
  },
  amountInput: {
    width: 240,
    fontSize: 72,
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    color: colors.textInverse,
    textAlign: 'left',
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },

  // ── Bucket toggle ─────────────────────────────────────────────────────────
  bucketRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 32,
  },
  bucketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  bucketDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bucketLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: -0.1,
  },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipsSection: {
    marginBottom: 24,
  },
  sectionCap: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 10,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 20,
  },

  // ── Custom title / note ───────────────────────────────────────────────────
  fieldSection: {
    marginBottom: 20,
  },
  fieldInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textInverse,
    letterSpacing: -0.1,
  },
  noteInput: {
    minHeight: 72,
    paddingTop: 13,
    textAlignVertical: 'top',
  },

  // ── Add note ──────────────────────────────────────────────────────────────
  addNotePressable: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  addNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
  },

  // ── Recurring ─────────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTextBlock: { flex: 1 },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
    marginBottom: 2,
  },
  switchHint: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // ── Live CTA ──────────────────────────────────────────────────────────────
  ctaWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 999,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ctaArrow: {
    fontSize: 17,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
