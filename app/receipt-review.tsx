import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { clearPendingReceiptUri, getPendingReceiptUri } from '../lib/receiptImageState';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function confidenceLabel(pct: number): { text: string; color: string } {
  if (pct >= 85) return { text: `${pct}% confidence`, color: colors.must };
  if (pct >= 60) return { text: `${pct}% confidence`, color: colors.want };
  return { text: `${pct}% — low confidence`, color: colors.danger };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ReceiptReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    merchant?:         string;
    amount?:           string;
    date?:             string;
    category?:         string;
    items?:            string;
    confidence?:       string;
    amountConfidence?: string;
  }>();
  const { addExpense, findPotentialDuplicate } = useExpensesDb();

  const receiptUri = getPendingReceiptUri();
  const resolvedDate = params.date || todayIso();

  const parsedItems: string[] = useMemo(() => {
    try { return JSON.parse(params.items || '[]'); } catch { return []; }
  }, [params.items]);

  const confidencePct =
    params.confidence ? Math.min(100, Math.max(0, Number(params.confidence))) : undefined;

  const amountConfidencePct =
    params.amountConfidence ? Math.min(100, Math.max(0, Number(params.amountConfidence))) : undefined;

  const initialBucket: ExpenseBucket = (() => {
    if (params.category === 'must') return 'must';
    if (params.category === 'want') return 'want';
    if (params.merchant)           return detectExpenseBucket(params.merchant);
    return 'want';
  })();

  const [merchant, setMerchant] = useState(params.merchant ?? '');
  const [amount,   setAmount]   = useState(params.amount   ?? '');
  const [note,     setNote]     = useState('');
  const [bucket,   setBucket]   = useState<ExpenseBucket>(initialBucket);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [showItems, setShowItems] = useState(false);

  const noteRef = useRef<TextInput>(null);

  const amountCents  = useMemo(() => parseMoneyToCents(amount), [amount]);
  const displayTitle = merchant.trim() || 'Receipt';
  const canSave      = amountCents > 0 && !saving;

  const showLowConfidenceBanner = confidencePct != null && confidencePct < 70;
  const showAmountConfidenceWarning = amountConfidencePct != null && amountConfidencePct < 80 && amountCents > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const dateIso = resolvedDate;
      const duplicate = await findPotentialDuplicate({
        amountCents,
        dateIso,
        title: displayTitle,
      });

      if (duplicate) {
        setSaving(false);
        Alert.alert(
          'Possible Duplicate',
          `A similar expense "${duplicate.title}" already exists for this amount and date. Save anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save Anyway',
              style: 'destructive',
              onPress: () => doSave(),
            },
          ]
        );
        return;
      }

      await doSave();
    } catch (e: any) {
      setError(e?.message || 'Could not save expense.');
      setSaving(false);
    }
  }

  async function doSave() {
    setSaving(true);
    setError('');
    try {
      await addExpense({
        title:       displayTitle,
        amountCents,
        spentOn:     new Date(resolvedDate + 'T00:00:00').toISOString(),
        note:        note.trim() || undefined,
        finalBucket: bucket,
      });
      hapticSuccess();
      clearPendingReceiptUri();
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

        <View style={styles.badgeRow}>
          <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
          <Text style={styles.badgeText}>Receipt</Text>
          {confidencePct != null && (
            <>
              <View style={styles.badgeDot} />
              <Text style={[styles.badgeConfidence, { color: confidenceLabel(confidencePct).color }]}>
                {confidenceLabel(confidencePct).text}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── Low confidence banner ── */}
      {showLowConfidenceBanner && (
        <View style={styles.lowConfBanner}>
          <Ionicons name="warning-outline" size={14} color={colors.want} />
          <Text style={styles.lowConfBannerText}>
            Low confidence — review all fields carefully before saving.
          </Text>
        </View>
      )}

      <Card variant="elevated">
        <SectionLabel style={styles.eyebrow}>Review</SectionLabel>
        <Text style={styles.title}>Confirm Expense</Text>

        {/* Receipt thumbnail + date chip row */}
        <View style={styles.metaRow}>
          {receiptUri ? (
            <Image
              source={{ uri: receiptUri }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.dateChipText}>{formatDisplayDate(resolvedDate)}</Text>
          </View>
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
            onSubmitEditing={() => noteRef.current?.focus()}
            blurOnSubmit={false}
            style={[styles.amountInput, !amountCents && styles.amountInputMissing]}
            autoFocus={!params.amount}
            accessibilityLabel="Expense amount"
          />
        </View>

        {!amountCents && (
          <View style={styles.amountWarning}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.want} />
            <Text style={styles.amountWarningText}>
              Amount wasn't extracted — enter it to save
            </Text>
          </View>
        )}

        {showAmountConfidenceWarning && (
          <View style={styles.amountWarning}>
            <Ionicons name="information-circle-outline" size={14} color={colors.want} />
            <Text style={styles.amountWarningText}>
              Amount may be approximate — verify against your receipt
            </Text>
          </View>
        )}

        {/* ── Merchant ── */}
        <Input
          label="Merchant"
          value={merchant}
          onChangeText={setMerchant}
          placeholder="Store or merchant name"
          returnKeyType="next"
          blurOnSubmit={false}
          containerStyle={styles.field}
          accessibilityLabel="Merchant name"
        />

        {/* ── Must / Want ── */}
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

        {/* ── Extracted items (collapsible) ── */}
        {parsedItems.length > 0 && (
          <View style={styles.field}>
            <Pressable
              onPress={() => setShowItems((v) => !v)}
              style={({ pressed }) => [styles.itemsToggle, pressed && styles.itemsTogglePressed]}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.itemsToggleText}>
                {showItems ? 'Hide' : 'Show'} extracted items ({parsedItems.length})
              </Text>
              <Ionicons
                name={showItems ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={colors.textMuted}
              />
            </Pressable>
            {showItems && (
              <View style={styles.itemsList}>
                {parsedItems.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

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
          onPress={() => router.replace('/expense-new' as any)}
          hitSlop={8}
          style={({ pressed }) => [styles.manualLink, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.manualLinkText}>Enter Manually Instead</Text>
        </Pressable>
      </Card>
    </AppScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
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

  // ── Low confidence banner ──────────────────────────────────────────────────
  lowConfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.wantSoft,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.want + '40',
  },
  lowConfBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.want,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Top badge ──────────────────────────────────────────────────────────────
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  badgeDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  badgeConfidence: {
    fontSize: 11,
    fontWeight: '600',
  },

  eyebrow: { marginBottom: spacing[2] },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[3],
  },

  // ── Meta row (thumbnail + date) ────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[1],
    flexWrap: 'wrap',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: spacing[3],
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },

  // ── Amount ────────────────────────────────────────────────────────────────
  amountSection: { marginTop: spacing[4] },
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

  // ── Fields ────────────────────────────────────────────────────────────────
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

  // ── Extracted items ───────────────────────────────────────────────────────
  itemsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
  },
  itemsTogglePressed: { opacity: 0.55 },
  itemsToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  itemsList: {
    marginTop: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  itemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    flexShrink: 0,
  },
  itemText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },

  // ── Error + links ─────────────────────────────────────────────────────────
  errorText: {
    marginTop: spacing[4],
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  manualLink: {
    alignSelf: 'center',
    marginTop: spacing[4],
    paddingVertical: spacing[2],
  },
  manualLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
