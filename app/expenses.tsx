import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DatePickerField } from '../components/DatePickerField';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useExpenseHistoryDb, type ExpenseHistoryItem } from '../db/expense-history';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { formatFriendlyDate } from '../lib/date';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

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

      <Card variant="outlined" style={styles.heroCard}>
        <SectionLabel style={styles.eyebrow}>Expenses</SectionLabel>
        <Text style={styles.pageTitle}>This month’s activity</Text>
        <Text style={styles.heroSubtext}>
          Review, edit, or remove what you logged.
        </Text>
      </Card>

      {editingId && (
        <Card variant="outlined" style={styles.editCard}>
          <View style={styles.editTopRow}>
            <Text style={styles.editTitle}>Edit expense</Text>
            <Pressable onPress={cancelEdit}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            containerStyle={styles.field}
          />

          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            containerStyle={styles.field}
          />

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

          <Input
            label="Note"
            value={note}
            onChangeText={setNote}
            style={styles.noteInput}
            containerStyle={styles.field}
            multiline
          />

          <Button
            label="Save changes"
            onPress={handleSaveEdit}
            disabled={!editingId || !title.trim() || amountCents <= 0}
            style={{ marginTop: spacing[5] }}
          />
        </Card>
      )}

      {groups.length === 0 ? (
        <Card variant="outlined">
          <Text style={styles.emptyTitle}>No expenses yet</Text>
          <Text style={styles.emptyBody}>
            Add your first expense and it will appear here.
          </Text>
        </Card>
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.groupWrap}>
            <Text style={styles.groupTitle}>{group.label}</Text>

            <Card variant="outlined" padding={false} style={styles.groupCard}>
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
            </Card>
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
    marginBottom: 18,
  },
  eyebrow: {
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
    backgroundColor: colors.keepSoft,
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