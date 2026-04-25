import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type AllExpensesItem,
  type ClosedMonth,
  useExpenseHistoryDb,
} from '../../db/expense-history';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { formatFriendlyDate, getMonthLabelFromKey } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { colors } from '../../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthGroup = {
  monthId: number;
  monthKey: string;
  label: string;
  expenses: AllExpensesItem[];
  total: number;
  isClosed: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGroups(
  expenses: AllExpensesItem[],
  closedMonths: ClosedMonth[]
): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

  // Seed from closed months so months with zero expenses still appear
  for (const m of closedMonths) {
    map.set(m.month_key, {
      monthId:  m.id,
      monthKey: m.month_key,
      label:    getMonthLabelFromKey(m.month_key),
      expenses: [],
      total:    0,
      isClosed: true,
    });
  }

  // Overlay expenses (handles active month + fills closed month groups)
  for (const e of expenses) {
    if (!map.has(e.month_key)) {
      map.set(e.month_key, {
        monthId:  e.month_id,
        monthKey: e.month_key,
        label:    getMonthLabelFromKey(e.month_key),
        expenses: [],
        total:    0,
        isClosed: false, // active month — not in closedMonths list
      });
    }
    const g = map.get(e.month_key)!;
    g.expenses.push(e);
    g.total += e.amount_cents;
  }

  return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

const BUCKET_COLOR: Record<string, string> = {
  must: colors.must,
  want: colors.want,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { getAllExpenses, getClosedMonths } = useExpenseHistoryDb();
  const { getCurrency } = useSettingsDb();

  const [groups,   setGroups]   = useState<MonthGroup[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAllExpenses(), getClosedMonths(), getCurrency()]).then(
        ([expenses, closed, cur]) => {
          setGroups(buildGroups(expenses, closed));
          setCurrency(cur);
        }
      );
    }, [getAllExpenses, getClosedMonths, getCurrency])
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <SectionLabel style={styles.eyebrow}>All time</SectionLabel>
        <Text style={styles.pageTitle}>History</Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyBody}>
            Close your first month to see it here.
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.monthKey} style={styles.monthSection}>

            {/* ── Month header ── */}
            <View style={styles.monthHeader}>
              <View style={styles.monthHeaderLeft}>
                <Text style={styles.monthLabel}>{group.label}</Text>
                {group.total > 0 && (
                  <Text style={styles.monthTotal}>
                    {formatCentsToMoney(group.total, currency)}
                  </Text>
                )}
              </View>

              {/* "Log missed expense" button — only on closed months */}
              {group.isClosed && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/past-month-expense' as any,
                      params: {
                        monthId:  String(group.monthId),
                        monthKey: group.monthKey,
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.addBtn,
                    pressed && styles.addBtnPressed,
                  ]}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              )}
            </View>

            {/* ── Expense rows ── */}
            {group.expenses.length === 0 ? (
              <View style={styles.emptyMonthCard}>
                <Text style={styles.emptyMonthText}>No expenses logged</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {group.expenses.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      router.push({
                        pathname: '/expense-edit' as any,
                        params: { id: String(item.id) },
                      })
                    }
                    style={({ pressed }) => [
                      styles.row,
                      idx !== 0 && styles.rowBorder,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.indicator,
                        {
                          backgroundColor: item.is_investment
                            ? colors.keep
                            : BUCKET_COLOR[item.final_bucket] ?? colors.textMuted,
                        },
                      ]}
                    />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {formatFriendlyDate(item.spent_on)}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text
                        style={[
                          styles.rowAmount,
                          item.is_investment && styles.rowAmountInvest,
                        ]}
                      >
                        {formatCentsToMoney(item.amount_cents, currency)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.border} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20 },

  header:    { marginBottom: 24 },
  eyebrow: {
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody:  { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },

  monthSection: { marginBottom: 24 },

  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthHeaderLeft: {
    flex: 1,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  monthTotal: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },

  // "Add" button on closed month headers
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  addBtnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  emptyMonthCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  emptyMonthText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 18,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  indicator: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 36,
    borderRadius: 2,
    marginLeft: 14,
  },

  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },

  rowPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.99 }],
  },

  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowAmountInvest: {
    color: colors.keep,
  },
});
