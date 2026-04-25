import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useExpensesDb } from '../db/expenses';
import { detectExpenseBucket, type ExpenseBucket } from '../lib/expenseClassifier';
import { hapticSuccess } from '../lib/haptics';
import { parseMoneyToCents } from '../lib/money';
import { parseShortcutParams } from '../lib/parseShortcutParams';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AddExpenseFromShortcutScreen() {
  const router    = useRouter();
  const rawParams = useLocalSearchParams<Record<string, string>>();
  const { addExpense } = useExpensesDb();

  const parsed = useMemo(() => parseShortcutParams(rawParams), []);

  // ── Form state — pre-filled from whatever the Shortcut provided ──────────────
  const [amount, setAmount] = useState(
    parsed.amount != null ? String(parsed.amount) : ''
  );
  const [title, setTitle] = useState(parsed.merchant ?? '');
  const [bucket, setBucket] = useState<ExpenseBucket>(
    parsed.merchant
      ? detectExpenseBucket(parsed.merchant)
      : parsed.categoryHint
      ? detectExpenseBucket(parsed.categoryHint)
      : 'want'
  );
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const titleRef = useRef<TextInput>(null);
  const noteRef  = useRef<TextInput>(null);

  const amountCents  = useMemo(() => parseMoneyToCents(amount), [amount]);
  const displayTitle = title.trim().length > 0 ? title.trim() : 'Apple Pay purchase';
  const canSave      = amountCents > 0 && !saving;

  const isApplePay = parsed.source === 'applepay';

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await addExpense({
        title: displayTitle,
        amountCents,
        spentOn: new Date(parsed.date + 'T00:00:00').toISOString(),
        note: note.trim() || undefined,
        finalBucket: bucket,
      });
      hapticSuccess();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message || 'Could not save expense.');
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

        <View style={[styles.sourceBadge, isApplePay && styles.sourceBadgeApplePay]}>
          <Ionicons
            name={isApplePay ? 'card' : 'flash'}
            size={12}
            color={isApplePay ? colors.keep : colors.primary}
          />
          <Text style={[styles.sourceBadgeText, isApplePay && styles.sourceBadgeTextApplePay]}>
            {isApplePay ? 'Apple Pay' : 'Shortcut'}
          </Text>
        </View>
      </View>

      <Card variant="elevated">
        <SectionLabel style={styles.eyebrow}>New expense</SectionLabel>
        <Text style={styles.title}>Apple Pay Expense{'\n'}Detected</Text>

        {/* ── Detected context strip ── */}
        <View style={styles.detectedStrip}>
          <View style={styles.detectedRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.detectedText}>{formatDisplayDate(parsed.date)}</Text>
          </View>
          {parsed.merchant && (
            <View style={styles.detectedRow}>
              <Ionicons name="storefront-outline" size={13} color={colors.textMuted} />
              <Text style={styles.detectedText}>{parsed.merchant}</Text>
            </View>
          )}
          {parsed.card && (
            <View style={styles.detectedRow}>
              <Ionicons name="card-outline" size={13} color={colors.textMuted} />
              <Text style={styles.detectedText}>{parsed.card}</Text>
            </View>
          )}
          {!parsed.merchant && !parsed.card && (
            <View style={styles.detectedRow}>
              <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
              <Text style={styles.detectedText}>No merchant info from Shortcut</Text>
            </View>
          )}
        </View>

        {/* ── Amount — primary focus ── */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => titleRef.current?.focus()}
            blurOnSubmit={false}
            style={[styles.amountInput, !amountCents && styles.amountInputMissing]}
            autoFocus={!parsed.amount}
            accessibilityLabel="Expense amount"
          />
        </View>

        {!amountCents && (
          <View style={styles.amountWarning}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.want} />
            <Text style={styles.amountWarningText}>
              Amount wasn't included by the Shortcut — enter it to save
            </Text>
          </View>
        )}

        {/* ── Description ── */}
        <Input
          ref={titleRef}
          label="Description"
          value={title}
          onChangeText={setTitle}
          placeholder="Apple Pay purchase"
          returnKeyType="next"
          onSubmitEditing={() => noteRef.current?.focus()}
          blurOnSubmit={false}
          hint={!parsed.merchant ? 'Merchant name wasn\'t provided by the Shortcut.' : undefined}
          containerStyle={styles.field}
          accessibilityLabel="Expense description"
        />

        {/* ── Bucket ── */}
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

        {/* ── Note ── */}
        <Input
          ref={noteRef}
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
          style={styles.noteInput}
          containerStyle={styles.field}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label={saving ? 'Saving…' : 'Save Expense'}
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
          style={{ marginTop: spacing[6] }}
        />

        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.cancelLink, pressed && styles.cancelLinkPressed]}
        >
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </Pressable>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // ── Source badge ────────────────────────────────────────────────────────────
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  sourceBadgeApplePay: {
    backgroundColor: colors.keepSoft,
    borderColor: colors.keep + '40',
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  sourceBadgeTextApplePay: {
    color: colors.keep,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  eyebrow: { marginBottom: spacing[2] },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[4],
  },

  // ── Detected strip ──────────────────────────────────────────────────────────
  detectedStrip: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detectedText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ── Amount ──────────────────────────────────────────────────────────────────
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
  amountInputMissing: {
    borderWidth: 1.5,
    borderColor: colors.want + '60',
  },
  amountWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingHorizontal: spacing[1],
  },
  amountWarningText: {
    flex: 1,
    fontSize: 13,
    color: colors.want,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Fields ──────────────────────────────────────────────────────────────────
  field: { marginTop: spacing[5] },
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

  // ── Error ───────────────────────────────────────────────────────────────────
  errorText: {
    marginTop: spacing[4],
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },

  // ── Cancel link at bottom ───────────────────────────────────────────────────
  cancelLink: {
    alignSelf: 'center',
    marginTop: spacing[4],
    paddingVertical: spacing[2],
  },
  cancelLinkPressed: {
    opacity: 0.5,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
