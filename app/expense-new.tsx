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
import { Chip } from '../components/ui/Chip';
import { Input } from '../components/ui/Input';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useExpensesDb } from '../db/expenses';
import { detectExpenseBucket, ExpenseBucket } from '../lib/expenseClassifier';
import { hapticSuccess } from '../lib/haptics';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

// ── Session-persistent smart defaults ────────────────────────────────────────
let _lastCategory: string | null = null;
let _lastBucket: ExpenseBucket = 'want';

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

  const [selected, setSelected]       = useState<string | null>(_lastCategory);
  const [customTitle, setCustomTitle] = useState('');
  const [amount, setAmount]           = useState('');
  const [note, setNote]               = useState('');
  const [bucket, setBucket]           = useState<ExpenseBucket>(_lastBucket);
  const [saving, setSaving]           = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const amountRef      = useRef<TextInput>(null);
  const customTitleRef = useRef<TextInput>(null);

  const isCustom    = selected === 'custom';
  const title       = isCustom ? customTitle : (selected ?? '');
  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);

  const canSave = title.trim().length > 0 && amountCents > 0 && !saving;

  function pickCategory(cat: Category) {
    setSelected(cat.label);
    setBucket(cat.bucket);
    _lastCategory = cat.label;
    _lastBucket = cat.bucket;
  }

  function pickCustom() {
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

  return (
    <AppScreen scroll>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => pressed && styles.cancelPressed}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <Card variant="elevated">
        <SectionLabel style={styles.eyebrow}>Expense</SectionLabel>
        <Text style={styles.title}>What did you spend on?</Text>

        {/* ── Amount — primary focus ── */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
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

        {/* ── Category chips ── */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionLabel}>Essentials</Text>
          <View style={styles.chipRow}>
            {ESSENTIALS.map((cat) => (
              <Chip
                key={cat.label}
                label={cat.label}
                emoji={cat.emoji}
                active={selected === cat.label}
                activeColor={colors.must}
                activeBgColor={colors.mustSoft}
                onPress={() => pickCategory(cat)}
              />
            ))}
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>Lifestyle</Text>
          <View style={styles.chipRow}>
            {LIFESTYLE.map((cat) => (
              <Chip
                key={cat.label}
                label={cat.label}
                emoji={cat.emoji}
                active={selected === cat.label}
                activeColor={colors.want}
                activeBgColor={colors.wantSoft}
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
          </View>
        </View>

        {/* ── Custom title ── */}
        {isCustom && (
          <Input
            ref={customTitleRef}
            label="What was it for?"
            value={customTitle}
            onChangeText={(text) => {
              setCustomTitle(text);
              setBucket(detectExpenseBucket(text));
            }}
            placeholder="e.g. Birthday gift, parking fine…"
            returnKeyType="next"
            onSubmitEditing={() => amountRef.current?.focus()}
            blurOnSubmit={false}
            accessibilityLabel="Custom expense description"
            containerStyle={styles.field}
          />
        )}

        {/* ── Bucket (Must / Want) ── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Counts as</Text>
          <SegmentedControl
            value={bucket}
            onChange={(v) => setBucket(v as ExpenseBucket)}
            options={[
              { value: 'must', label: 'Must', activeColor: colors.must, activeBgColor: colors.mustSoft },
              { value: 'want', label: 'Want', activeColor: colors.want, activeBgColor: colors.wantSoft },
            ]}
          />
        </View>

        {/* ── Options ── */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Recurring expense</Text>
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

        {/* ── Note ── */}
        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
          style={styles.noteInput}
          containerStyle={styles.field}
        />

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
  cancelPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },
  eyebrow: {
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },

  // ── Amount — primary field ────────────────────────────────────────────────
  amountSection: {
    marginTop: spacing[4],
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[2],
  },
  amountInput: {
    minHeight: 68,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text,
  },

  // ── Category ──────────────────────────────────────────────────────────────
  categorySection: {
    marginTop: spacing[6],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[2] + 2,
  },
  sectionLabelGap: {
    marginTop: spacing[4],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },

  // ── Secondary fields ──────────────────────────────────────────────────────
  field: {
    marginTop: spacing[5],
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },

  // ── Options ───────────────────────────────────────────────────────────────
  switchRow: {
    marginTop: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textTertiary,
  },
});
