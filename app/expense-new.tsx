import { useRouter } from 'expo-router';
import { useRef } from 'react';
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
import { ExpenseBucketToggle } from '../components/expense/ExpenseBucketToggle';
import { ExpenseCategoryChips } from '../components/expense/ExpenseCategoryChips';
import { ExpenseSaveCta } from '../components/expense/ExpenseSaveCta';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/tokens';

// ── Currency symbol map ───────────────────────────────────────────────────────
import { type SupportedCurrency } from '../db/settings';
const CURRENCY_SYMBOL: Record<SupportedCurrency, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
};

export default function NewExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const amountRef      = useRef<TextInput>(null);
  const customTitleRef = useRef<TextInput>(null);
  const noteRef        = useRef<TextInput>(null);

  const form = useExpenseForm({
    onSaved: () => router.replace('/(tabs)/home'),
  });

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
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => pressed && styles.cancelPressed}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {/* ── Amount hero ── */}
          <View style={styles.amountHero}>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyGlyph}>
                {CURRENCY_SYMBOL[form.currency]}
              </Text>
              <TextInput
                ref={amountRef}
                value={form.amount}
                onChangeText={form.setAmount}
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
          <ExpenseBucketToggle
            bucket={form.bucket}
            onChange={form.handleBucketChange}
          />

          {/* ── Category chips ── */}
          <ExpenseCategoryChips
            chips={form.visibleChips}
            selected={form.selected}
            isCustom={form.isCustom}
            bucketColor={form.bucketColor}
            bucketSoft={form.bucketSoft}
            onSelectCategory={form.pickCategory}
            onSelectCustom={() => form.pickCustom(() => customTitleRef.current?.focus())}
          />

          {/* ── Custom title ── */}
          {form.isCustom && (
            <View style={styles.fieldSection}>
              <Text style={styles.sectionCap}>What was it for?</Text>
              <TextInput
                ref={customTitleRef}
                value={form.customTitle}
                onChangeText={form.handleCustomTitleChange}
                placeholder="Birthday gift, parking fine…"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                onSubmitEditing={() => { if (form.showNote) noteRef.current?.focus(); }}
                blurOnSubmit={false}
                style={styles.fieldInput}
                accessibilityLabel="Custom expense description"
              />
            </View>
          )}

          {/* ── Note ── */}
          {form.showNote ? (
            <View style={styles.fieldSection}>
              <Text style={styles.sectionCap}>Note</Text>
              <TextInput
                ref={noteRef}
                value={form.note}
                onChangeText={form.setNote}
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
                form.setShowNote(true);
                setTimeout(() => noteRef.current?.focus(), 50);
              }}
              style={styles.addNotePressable}
              accessibilityRole="button"
              accessibilityLabel="Add a note"
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
              value={form.isRecurring}
              onValueChange={form.setIsRecurring}
              trackColor={{ false: colors.border, true: colors.switchTrackOn }}
              thumbColor={form.isRecurring ? colors.primary : colors.white}
              accessibilityLabel="Mark as recurring"
            />
          </View>
        </ScrollView>

        {/* ── Live CTA ── */}
        <ExpenseSaveCta
          canSave={form.canSave}
          saving={form.saving}
          amountCents={form.amountCents}
          currency={form.currency}
          bucket={form.bucket}
          onSave={form.handleSave}
          paddingBottom={insets.bottom}
        />
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

  // ── Custom title / note ───────────────────────────────────────────────────
  fieldSection: {
    marginBottom: 20,
  },
  sectionCap: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 10,
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
    paddingVertical: 10,
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
});
