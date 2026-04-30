import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../components/ui/BackButton';
import { Button } from '../components/ui/Button';
import { SectionLabel } from '../components/ui/SectionLabel';
import { type RecurringExpense, type AddRecurringInput, useRecurringDb } from '../db/recurring';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

// ─── Bucket toggle ────────────────────────────────────────────────────────────

function BucketPicker({
  value,
  onChange,
}: {
  value: 'must' | 'want';
  onChange: (v: 'must' | 'want') => void;
}) {
  return (
    <View style={bpStyles.row}>
      {(['must', 'want'] as const).map((b) => {
        const active = value === b;
        const color  = b === 'must' ? colors.must     : colors.want;
        const soft   = b === 'must' ? colors.mustSoft  : colors.wantSoft;
        return (
          <Pressable
            key={b}
            onPress={() => { hapticLight(); onChange(b); }}
            style={[bpStyles.btn, active && { backgroundColor: soft, borderColor: color + '80' }]}
          >
            <View style={[bpStyles.dot, { backgroundColor: color, opacity: active ? 1 : 0.3 }]} />
            <Text style={[bpStyles.label, active && { color, fontWeight: '700' }]}>
              {b === 'must' ? 'Must' : 'Want'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const bpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.panel,
  },
  dot:   { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});

// ─── Add / edit form ──────────────────────────────────────────────────────────

type FormState = {
  title: string;
  amount: string;
  bucket: 'must' | 'want';
  dayOfMonth: string;
};

const EMPTY_FORM: FormState = { title: '', amount: '', bucket: 'must', dayOfMonth: '1' };

function recurringToForm(r: RecurringExpense): FormState {
  return {
    title:      r.title,
    amount:     String(r.amount_cents / 100),
    bucket:     r.bucket,
    dayOfMonth: String(r.day_of_month),
  };
}

function validateForm(f: FormState): string | null {
  if (!f.title.trim())               return 'Name is required';
  if (parseMoneyToCents(f.amount) <= 0) return 'Enter a valid amount';
  const day = parseInt(f.dayOfMonth, 10);
  if (isNaN(day) || day < 1 || day > 31) return 'Day must be between 1 and 31';
  return null;
}

// ─── Row component ────────────────────────────────────────────────────────────

function RecurringRow({
  item,
  currency,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: RecurringExpense;
  currency: SupportedCurrency;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const bucketColor = item.bucket === 'must' ? colors.must : colors.want;
  const inactive    = !item.is_active;

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [rowStyles.root, pressed && rowStyles.pressed, inactive && rowStyles.inactive]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${item.title}`}
    >
      {/* Bucket accent bar */}
      <View style={[rowStyles.accentBar, { backgroundColor: bucketColor }]} />

      {/* Info */}
      <View style={rowStyles.info}>
        <Text style={[rowStyles.title, inactive && rowStyles.titleInactive]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={rowStyles.meta}>
          {formatCentsToMoney(item.amount_cents, currency)}
          {' · '}
          <Text style={{ color: bucketColor }}>{item.bucket === 'must' ? 'Must' : 'Want'}</Text>
          {' · Day '}{item.day_of_month}
        </Text>
      </View>

      {/* Actions */}
      <View style={rowStyles.actions}>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          style={({ pressed }) => [rowStyles.actionBtn, pressed && rowStyles.actionBtnPressed]}
          accessibilityLabel={item.is_active ? 'Pause' : 'Resume'}
        >
          <Ionicons
            name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
            size={22}
            color={item.is_active ? colors.textMuted : colors.primary}
          />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={({ pressed }) => [rowStyles.actionBtn, pressed && rowStyles.actionBtnPressed]}
          accessibilityLabel="Delete"
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed:  { opacity: 0.75 },
  inactive: { opacity: 0.55 },
  accentBar: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 3 },
  titleInactive: { color: colors.textMuted },
  meta:  { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, gap: 2 },
  actionBtn: { padding: 6, borderRadius: 8 },
  actionBtnPressed: { backgroundColor: colors.surfaceSoft },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecurringScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { getAll, add, update, setActive, remove } = useRecurringDb();
  const { getCurrency } = useSettingsDb();

  const [items,    setItems]    = useState<RecurringExpense[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  // Form state
  const [editingId,    setEditingId]    = useState<number | null>(null);
  const [formVisible,  setFormVisible]  = useState(false);
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState<string | null>(null);

  const amountRef = useRef<TextInput>(null);
  const dayRef    = useRef<TextInput>(null);

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const [all, cur] = await Promise.all([getAll(), getCurrency()]);
      setItems(all);
      setCurrency(cur);
    } catch {
      setLoadError(true);
    }
  }, [getAll, getCurrency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openAdd() {
    hapticLight();
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormVisible(true);
  }

  function openEdit(item: RecurringExpense) {
    hapticLight();
    setEditingId(item.id);
    setForm(recurringToForm(item));
    setFormError(null);
    setFormVisible(true);
  }

  function cancelForm() {
    setFormVisible(false);
    setEditingId(null);
    setFormError(null);
  }

  async function submitForm() {
    const err = validateForm(form);
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError(null);
    try {
      const input: AddRecurringInput = {
        title:      form.title.trim(),
        amountCents: parseMoneyToCents(form.amount),
        bucket:     form.bucket,
        dayOfMonth: parseInt(form.dayOfMonth, 10),
      };
      if (editingId !== null) {
        await update(editingId, input);
      } else {
        await add(input);
      }
      hapticSuccess();
      setFormVisible(false);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: RecurringExpense) {
    hapticLight();
    try {
      await setActive(item.id, !item.is_active);
      await load();
    } catch {
      Alert.alert('Error', 'Could not update recurring expense.');
    }
  }

  function handleDelete(item: RecurringExpense) {
    Alert.alert(
      `Delete "${item.title}"?`,
      'This recurring expense and its history will be removed. Past expenses already logged are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(item.id);
              await load();
            } catch {
              Alert.alert('Error', 'Could not delete recurring expense.');
            }
          },
        },
      ],
    );
  }

  const activeItems   = items.filter((i) => i.is_active);
  const inactiveItems = items.filter((i) => !i.is_active);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => router.back()} />

        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <SectionLabel style={styles.eyebrow}>Expenses</SectionLabel>
          <Text style={styles.pageTitle}>Recurring</Text>
          <Text style={styles.pageSub}>
            Monthly expenses you log with one tap. No auto-posting — you stay in control.
          </Text>
        </View>

        {/* ── Add / edit form ── */}
        {formVisible && (
          <View style={styles.formCard}>
            <Text style={styles.formHeading}>{editingId !== null ? 'Edit expense' : 'New recurring expense'}</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="Rent, Phone bill, Gym…"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              blurOnSubmit={false}
              style={styles.fieldInput}
              autoFocus={!editingId}
            />

            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
              ref={amountRef}
              value={form.amount}
              onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => dayRef.current?.focus()}
              blurOnSubmit={false}
              style={styles.fieldInput}
            />

            <Text style={styles.fieldLabel}>Bucket</Text>
            <BucketPicker
              value={form.bucket}
              onChange={(v) => setForm((f) => ({ ...f, bucket: v }))}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing[4] }]}>Day of month</Text>
            <TextInput
              ref={dayRef}
              value={form.dayOfMonth}
              onChangeText={(v) => setForm((f) => ({ ...f, dayOfMonth: v }))}
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              returnKeyType="done"
              style={[styles.fieldInput, styles.dayInput]}
            />
            <Text style={styles.dayHint}>
              Amounts due on days 29–31 are clamped to the last day of shorter months.
            </Text>

            {formError && <Text style={styles.formError}>{formError}</Text>}

            <View style={styles.formActions}>
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                fullWidth={false}
                onPress={cancelForm}
                style={styles.formActionBtn}
              />
              <Button
                label={saving ? 'Saving…' : editingId !== null ? 'Save' : 'Add'}
                size="md"
                fullWidth={false}
                loading={saving}
                onPress={submitForm}
                style={styles.formActionBtn}
              />
            </View>
          </View>
        )}

        {/* ── Load error ── */}
        {loadError && !formVisible && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Could not load recurring expenses.</Text>
          </View>
        )}

        {/* ── Active list ── */}
        {activeItems.length > 0 && (
          <View style={styles.section}>
            <SectionLabel style={styles.sectionLabel}>Active</SectionLabel>
            {activeItems.map((item) => (
              <RecurringRow
                key={item.id}
                item={item}
                currency={currency}
                onEdit={() => openEdit(item)}
                onToggle={() => handleToggle(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </View>
        )}

        {/* ── Inactive list ── */}
        {inactiveItems.length > 0 && (
          <View style={styles.section}>
            <SectionLabel style={styles.sectionLabel}>Paused</SectionLabel>
            {inactiveItems.map((item) => (
              <RecurringRow
                key={item.id}
                item={item}
                currency={currency}
                onEdit={() => openEdit(item)}
                onToggle={() => handleToggle(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </View>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && !formVisible && (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No recurring expenses yet</Text>
            <Text style={styles.emptyBody}>
              Add your rent, phone bill, subscriptions, and other monthly costs once. Each month you can log them with a single tap.
            </Text>
          </View>
        )}

        {/* ── Add button ── */}
        {!formVisible && (
          <Button
            label="Add Recurring Expense"
            onPress={openAdd}
            leadingIcon={<Ionicons name="add" size={18} color={colors.white} />}
            style={{ marginTop: items.length === 0 ? spacing[4] : spacing[2] }}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  pageHeader: {
    marginTop: spacing[3],
    marginBottom: spacing[5],
    paddingHorizontal: 4,
  },
  eyebrow: { marginBottom: 4 },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  pageSub: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
  },

  // Form
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  formHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[5],
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 8,
    marginTop: spacing[4],
  },
  fieldInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  dayInput: { width: 80 },
  dayHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
    lineHeight: 17,
  },
  formError: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 12,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing[5],
  },
  formActionBtn: { paddingHorizontal: spacing[5] },

  // List
  section: { marginBottom: 12 },
  sectionLabel: { marginBottom: 10 },

  // Error banner
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.danger,
    textAlign: 'center' as const,
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[2],
    gap: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    textAlign: 'center',
  },
});
