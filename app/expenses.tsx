import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { useExpenseHistoryDb, type ExpenseHistoryItem } from '../db/expense-history';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { formatFriendlyDate } from '../lib/date';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

type Group = {
  label: string;
  items: ExpenseHistoryItem[];
};

export default function ExpensesScreen() {
  const router = useRouter();
  const { getActiveMonthExpenses, updateExpense, deleteExpense } = useExpenseHistoryDb();
  const { getCurrency } = useSettingsDb();

  const [items, setItems] = useState<ExpenseHistoryItem[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [bucket, setBucket] = useState<'must' | 'want'>('want');
  const [spentOn, setSpentOn] = useState(new Date());

  const load = useCallback(async () => {
    const [expenses, savedCurrency] = await Promise.all([
      getActiveMonthExpenses(),
      getCurrency(),
    ]);

    setItems(expenses ?? []);
    setCurrency(savedCurrency);
  }, [getActiveMonthExpenses, getCurrency]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, ExpenseHistoryItem[]>();

    for (const item of items) {
      const key = item.spent_on.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }

    return Array.from(map.entries()).map(([key, value]) => ({
      label: formatFriendlyDate(key),
      items: value,
    }));
  }, [items]);

  function startEdit(item: ExpenseHistoryItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setAmount(String(item.amount_cents / 100));
    setNote(item.note || '');
    setBucket(item.final_bucket);
    setSpentOn(new Date(item.spent_on));
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setNote('');
    setBucket('want');
    setSpentOn(new Date());
  }

  async function handleSaveEdit() {
    if (!editingId || !title.trim() || amountCents <= 0) return;

    await updateExpense({
      id: editingId,
      title,
      amountCents,
      spentOn: spentOn.toISOString(),
      note,
      finalBucket: bucket,
    });

    cancelEdit();
    await load();
  }

  function handleDeleteExpense(id: number) {
    Alert.alert(
      'Delete expense',
      'This will remove the expense from the month totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(id);
            if (editingId === id) {
              cancelEdit();
            }
            await load();
          },
        },
      ]
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Expenses</Text>
        <Text style={styles.pageTitle}>This month’s activity</Text>
        <Text style={styles.heroSubtext}>
          Review, edit, or remove what you logged.
        </Text>
      </View>

      {editingId && (
        <View style={styles.editCard}>
          <View style={styles.editTopRow}>
            <Text style={styles.editTitle}>Edit expense</Text>
            <Pressable onPress={cancelEdit}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <DatePickerField value={spentOn} onChange={setSpentOn} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setBucket('must')}
                style={[
                  styles.segmentButton,
                  bucket === 'must' && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    bucket === 'must' && styles.segmentTextActive,
                  ]}
                >
                  Must
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setBucket('want')}
                style={[
                  styles.segmentButton,
                  bucket === 'want' && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    bucket === 'want' && styles.segmentTextActive,
                  ]}
                >
                  Want
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.noteInput]}
              multiline
            />
          </View>

          <Pressable onPress={handleSaveEdit} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save changes</Text>
          </Pressable>
        </View>
      )}

      {groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No expenses yet</Text>
          <Text style={styles.emptyBody}>
            Add your first expense and it will appear here.
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.groupWrap}>
            <Text style={styles.groupTitle}>{group.label}</Text>

            <View style={styles.groupCard}>
              {group.items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.row,
                    index !== 0 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.left}>
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={styles.metaRow}>
                      <View
                        style={[
                          styles.badge,
                          item.is_investment
                            ? styles.badgeInvest
                            : item.final_bucket === 'must'
                            ? styles.badgeMust
                            : styles.badgeWant,
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {item.is_investment
                            ? 'Invest'
                            : item.final_bucket === 'must'
                            ? 'Must'
                            : 'Want'}
                        </Text>
                      </View>

                      {!!item.note && (
                        <Text numberOfLines={1} style={styles.note}>
                          {item.note}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.right}>
                    <Text style={styles.amount}>
                      {formatCentsToMoney(item.amount_cents, currency)}
                    </Text>

                    <View style={styles.rowActions}>
                      <Pressable onPress={() => startEdit(item)}>
                        <Text style={styles.editLink}>Edit</Text>
                      </Pressable>

                      <Pressable onPress={() => handleDeleteExpense(item.id)}>
                        <Text style={styles.deleteLink}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  heroSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  editCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
  },
  editTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  field: {
    marginTop: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  noteInput: {
    minHeight: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  saveButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  groupWrap: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeMust: {
    backgroundColor: colors.mustSoft,
  },
  badgeWant: {
    backgroundColor: colors.wantSoft,
  },
  badgeInvest: {
    backgroundColor: '#D6E4F7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  note: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});