import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useExpensesDb } from '../db/expenses';
import { detectExpenseBucket, ExpenseBucket } from '../lib/expenseClassifier';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

// ── Category presets ─────────────────────────────────────────────────────────

type Category = {
  label: string;
  emoji: string;
  bucket: ExpenseBucket;
};

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
  const { addExpense } = useExpensesDb();

  // 'custom' | category label | null
  const [selected, setSelected]   = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [amount, setAmount]        = useState('');
  const [note, setNote]            = useState('');
  const [bucket, setBucket]        = useState<ExpenseBucket>('want');
  const [saving, setSaving]        = useState(false);
  const [isInvestmentTransfer, setIsInvestmentTransfer] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const amountRef     = useRef<TextInput>(null);
  const customTitleRef = useRef<TextInput>(null);

  const isCustom = selected === 'custom';
  const title = isCustom ? customTitle : (selected ?? '');
  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);

  const canSave =
    title.trim().length > 0 &&
    amountCents > 0 &&
    !saving;

  function pickCategory(cat: Category) {
    setSelected(cat.label);
    setBucket(cat.bucket);
    setTimeout(() => amountRef.current?.focus(), 50);
  }

  function pickCustom() {
    setSelected('custom');
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
        createInvestmentRecord: isInvestmentTransfer,
        isRecurring,
      });

      if (isInvestmentTransfer) {
        router.replace({
          pathname: '/investment-new' as any,
          params: {
            prefillName: title.trim(),
            prefillAmountCents: String(amountCents),
          },
        });
      } else {
        router.replace('/(tabs)/home');
      }
    } finally {
      setSaving(false);
    }
  }

  // Chip style helpers
  function chipStyle(cat: Category) {
    const active = selected === cat.label;
    if (!active) return styles.chip;
    return [
      styles.chip,
      cat.bucket === 'must' ? styles.chipMustActive : styles.chipWantActive,
    ];
  }
  function chipTextStyle(cat: Category) {
    const active = selected === cat.label;
    if (!active) return styles.chipText;
    return [
      styles.chipText,
      cat.bucket === 'must' ? styles.chipTextMust : styles.chipTextWant,
    ];
  }

  return (
    <AppScreen scroll>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <Card variant="outlined">
        <SectionLabel style={styles.eyebrow}>Expense</SectionLabel>
        <Text style={styles.title}>What did you spend on?</Text>

        {/* ── Essentials section ── */}
        <Text style={styles.sectionLabel}>Essentials</Text>
        <View style={styles.chipRow}>
          {ESSENTIALS.map((cat) => (
            <Pressable
              key={cat.label}
              onPress={() => pickCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: selected === cat.label }}
              style={({ pressed }) => [
                chipStyle(cat),
                pressed && selected !== cat.label && styles.chipPressed,
              ]}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={chipTextStyle(cat)}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Lifestyle section ── */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Lifestyle</Text>
        <View style={styles.chipRow}>
          {LIFESTYLE.map((cat) => (
            <Pressable
              key={cat.label}
              onPress={() => pickCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: selected === cat.label }}
              style={({ pressed }) => [
                chipStyle(cat),
                pressed && selected !== cat.label && styles.chipPressed,
              ]}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={chipTextStyle(cat)}>{cat.label}</Text>
            </Pressable>
          ))}

          {/* Custom chip */}
          <Pressable
            onPress={pickCustom}
            accessibilityRole="button"
            accessibilityLabel="Custom category"
            accessibilityState={{ selected: isCustom }}
            style={({ pressed }) => [
              styles.chip,
              isCustom && styles.chipCustomActive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.chipEmoji}>✏️</Text>
            <Text style={[styles.chipText, isCustom && styles.chipTextCustom]}>
              Custom
            </Text>
          </Pressable>
        </View>

        {/* ── Custom title input ── */}
        {isCustom && (
          <View style={styles.field}>
            <Text style={styles.label}>What was it for?</Text>
            <TextInput
              ref={customTitleRef}
              value={customTitle}
              onChangeText={(text) => {
                setCustomTitle(text);
                setBucket(detectExpenseBucket(text));
              }}
              placeholder="e.g. Birthday gift, parking fine…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              blurOnSubmit={false}
              accessibilityLabel="Custom expense description"
            />
          </View>
        )}

        {/* ── Amount ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            ref={amountRef}
            value={amount}
            onChangeText={setAmount}
            placeholder="120"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="Amount"
          />
        </View>

        {/* ── Bucket (Must / Want) ── */}
        {!isInvestmentTransfer && (
          <View style={styles.field}>
            <Text style={styles.label}>Counts as</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setBucket('must')}
                accessibilityRole="button"
                accessibilityLabel="Must — essential spending"
                accessibilityState={{ selected: bucket === 'must' }}
                style={[styles.segmentButton, bucket === 'must' && styles.segmentMustActive]}
              >
                <Text style={[styles.segmentText, bucket === 'must' && styles.segmentMustText]}>
                  Must
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBucket('want')}
                accessibilityRole="button"
                accessibilityLabel="Want — discretionary spending"
                accessibilityState={{ selected: bucket === 'want' }}
                style={[styles.segmentButton, bucket === 'want' && styles.segmentWantActive]}
              >
                <Text style={[styles.segmentText, bucket === 'want' && styles.segmentWantText]}>
                  Want
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Recurring toggle ── */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Recurring expense</Text>
            <Text style={styles.switchHint}>Repeats monthly — rent, subscriptions, insurance.</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.switchTrackOn }}
            thumbColor={isRecurring ? colors.primary : colors.white}
            accessibilityLabel="Mark as recurring expense"
          />
        </View>

        {/* ── Investment transfer toggle ── */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>This went into an investment</Text>
            <Text style={styles.switchHint}>
              Save it as spending and create an investment record too.
            </Text>
          </View>
          <Switch
            value={isInvestmentTransfer}
            onValueChange={setIsInvestmentTransfer}
            trackColor={{ false: colors.border, true: colors.switchTrackOn }}
            thumbColor={isInvestmentTransfer ? colors.primary : colors.white}
            accessibilityLabel="Mark as investment transfer"
          />
        </View>

        {isInvestmentTransfer && (
          <View style={styles.investNotice}>
            <Text style={styles.investNoticeText}>
              This amount will be tracked under Invest. You'll be taken to the investment form to add more details.
            </Text>
          </View>
        )}

        {/* ── Note ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.noteInput]}
            multiline
          />
        </View>

        <Button
          label={saving ? 'Saving…' : 'Save'}
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[3],
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  eyebrow: {
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[5],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textTertiary,        // structural chrome — recedes from content
    marginBottom: spacing[2] + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipMustActive: {
    backgroundColor: colors.mustSoft,
    borderColor: colors.must,
  },
  chipWantActive: {
    backgroundColor: colors.wantSoft,
    borderColor: colors.want,
  },
  chipCustomActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  chipEmoji: {
    fontSize: 15,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextMust:   { color: colors.must },
  chipTextWant:   { color: colors.want },
  chipTextCustom: { color: colors.primary },
  field: {
    marginTop: spacing[5],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    fontSize: 16,
    color: colors.text,
    justifyContent: 'center',
  },
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing[2] + 2,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentMustActive: {
    backgroundColor: colors.mustSoft,
    borderColor: colors.must,
  },
  segmentWantActive: {
    backgroundColor: colors.wantSoft,
    borderColor: colors.want,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentMustText: { color: colors.must },
  segmentWantText: { color: colors.want },
  switchRow: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.background,  // calmer than surfaceSoft
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textTertiary,
    marginTop: 2,
  },
  investNotice: {
    marginTop: spacing[3],
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  investNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    fontWeight: '500',
  },
});
