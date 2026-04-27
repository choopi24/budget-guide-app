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
import { fonts } from '../../theme/fonts';
import { radius, shadows, TAB_BAR_MARGIN_BOTTOM, TAB_BAR_PILL_HEIGHT } from '../../theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'must' | 'want' | 'invest';

type DayGroup = {
  dateKey: string;
  label: string;
  expenses: AllExpensesItem[];
  total: number;
};

type MonthGroup = {
  monthId: number;
  monthKey: string;
  label: string;
  expenses: AllExpensesItem[];
  total: number;
  isClosed: boolean;
};

// ─── Filter config ────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string; color: string; soft: string }[] = [
  { key: 'all',    label: 'All',    color: colors.primary, soft: colors.surfaceSoft },
  { key: 'must',   label: 'Must',   color: colors.must,    soft: colors.mustSoft },
  { key: 'want',   label: 'Want',   color: colors.want,    soft: colors.wantSoft },
  { key: 'invest', label: 'Invest', color: colors.keep,    soft: colors.keepSoft },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGroups(
  expenses: AllExpensesItem[],
  closedMonths: ClosedMonth[]
): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

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

  for (const e of expenses) {
    if (!map.has(e.month_key)) {
      map.set(e.month_key, {
        monthId:  e.month_id,
        monthKey: e.month_key,
        label:    getMonthLabelFromKey(e.month_key),
        expenses: [],
        total:    0,
        isClosed: false,
      });
    }
    const g = map.get(e.month_key)!;
    g.expenses.push(e);
    g.total += e.amount_cents;
  }

  return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function filterExpenses(expenses: AllExpensesItem[], filter: FilterKey): AllExpensesItem[] {
  switch (filter) {
    case 'must':   return expenses.filter(e => e.is_investment === 0 && e.final_bucket === 'must');
    case 'want':   return expenses.filter(e => e.is_investment === 0 && e.final_bucket === 'want');
    case 'invest': return expenses.filter(e => e.is_investment === 1);
    default:       return expenses;
  }
}

function buildDayGroups(expenses: AllExpensesItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of expenses) {
    const key = e.spent_on.slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) {
      map.set(key, {
        dateKey:  key,
        label:    formatFriendlyDate(key),
        expenses: [],
        total:    0,
      });
    }
    const g = map.get(key)!;
    g.expenses.push(e);
    g.total += e.amount_cents;
  }
  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function getBucketMeta(item: AllExpensesItem): { label: string; color: string; soft: string } {
  if (item.is_investment) return { label: 'Invest', color: colors.keep, soft: colors.keepSoft };
  if (item.final_bucket === 'must') return { label: 'Must', color: colors.must, soft: colors.mustSoft };
  return { label: 'Want', color: colors.want, soft: colors.wantSoft };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { getAllExpenses, getClosedMonths } = useExpenseHistoryDb();
  const { getCurrency } = useSettingsDb();

  const [groups,   setGroups]   = useState<MonthGroup[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [filter,   setFilter]   = useState<FilterKey>('all');

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
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + TAB_BAR_PILL_HEIGHT + TAB_BAR_MARGIN_BOTTOM + 28 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <SectionLabel style={styles.eyebrow}>All time</SectionLabel>
        <Text style={styles.pageTitle}>History</Text>
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map(f => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: f.soft, borderColor: f.color + '70' },
              ]}
            >
              <Text style={[styles.filterChipText, isActive && { color: f.color }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      {groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyBody}>
            Close your first month to see it here.
          </Text>
        </View>
      ) : (
        groups.map((group) => {
          const filtered    = filterExpenses(group.expenses, filter);
          const dayGroups   = buildDayGroups(filtered);
          const showSection = filtered.length > 0 || filter === 'all';

          if (!showSection) return null;

          return (
            <View key={group.monthKey} style={styles.monthSection}>

              {/* ── Month header ── */}
              <View style={styles.monthHeader}>
                <View style={styles.monthHeaderLeft}>
                  <Text style={styles.monthLabel}>{group.label}</Text>
                  {filtered.length > 0 && (
                    <Text style={styles.monthTotal}>
                      {formatCentsToMoney(
                        filtered.reduce((s, e) => s + e.amount_cents, 0),
                        currency,
                      )}
                    </Text>
                  )}
                </View>

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

              {/* ── Day groups ── */}
              {filtered.length === 0 ? (
                <View style={styles.emptyMonthCard}>
                  <Text style={styles.emptyMonthText}>No expenses logged</Text>
                </View>
              ) : (
                dayGroups.map((day) => (
                  <View key={day.dateKey} style={styles.daySection}>
                    {/* Day header */}
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.dayTotal}>
                        {formatCentsToMoney(day.total, currency)}
                      </Text>
                    </View>

                    {/* Receipt card for this day's expenses */}
                    <View style={styles.card}>
                      {day.expenses.map((item, idx) => {
                        const bucket = getBucketMeta(item);
                        return (
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
                            {/* Bucket color bar */}
                            <View
                              style={[styles.indicator, { backgroundColor: bucket.color }]}
                            />

                            {/* Title + badge */}
                            <View style={styles.rowBody}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <View style={styles.rowMetaRow}>
                                <View
                                  style={[
                                    styles.bucketBadge,
                                    { backgroundColor: bucket.soft, borderColor: bucket.color + '50' },
                                  ]}
                                >
                                  <Text style={[styles.bucketBadgeText, { color: bucket.color }]}>
                                    {bucket.label}
                                  </Text>
                                </View>
                                {item.note ? (
                                  <Text style={styles.rowNote} numberOfLines={1}>
                                    {item.note}
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            {/* Amount + chevron */}
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowAmount, { color: bucket.color }]}>
                                {formatCentsToMoney(item.amount_cents, currency)}
                              </Text>
                              <Ionicons name="chevron-forward" size={14} color={colors.border} />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20 },

  // ── Header ────────────────────────────────────────────────────────────────
  header:    { marginBottom: 16 },
  eyebrow:   { marginBottom: 6 },
  pageTitle: {
    fontSize: 34,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.5,
  },

  // ── Filter chips ──────────────────────────────────────────────────────────
  filterScroll: {
    marginBottom: 20,
    marginHorizontal: -20,  // bleed to edges
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: -0.1,
  },

  // ── Empty states ──────────────────────────────────────────────────────────
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

  emptyMonthCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  emptyMonthText: { fontSize: 14, color: colors.textMuted },

  // ── Month section ─────────────────────────────────────────────────────────
  monthSection: { marginBottom: 28 },

  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthHeaderLeft: { flex: 1 },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textInverse,
  },
  monthTotal: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
  },
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

  // ── Day section ───────────────────────────────────────────────────────────
  daySection: { marginBottom: 12 },

  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  dayTotal: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    color: colors.textTertiary,
  },

  // ── Receipt card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 16,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.99 }],
  },

  indicator: {
    width: 3,
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
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bucketBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
  },
  bucketBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rowNote: {
    fontSize: 12,
    color: colors.textTertiary,
    flexShrink: 1,
  },

  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
});
