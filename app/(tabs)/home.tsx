import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useHomeDb } from '../../db/home';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';

type RowItem = {
  label: string;
  hint: string;
  used: number;
  planned: number;
  color: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { getActiveMonthHomeData } = useHomeDb();
  const { getCurrency } = useSettingsDb();

  const [month, setMonth] = useState<any>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  const load = useCallback(async () => {
    const [monthData, savedCurrency] = await Promise.all([
      getActiveMonthHomeData(),
      getCurrency(),
    ]);

    setMonth(monthData ?? null);
    setCurrency(savedCurrency);
  }, [getActiveMonthHomeData, getCurrency]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!month) {
    return (
      <AppScreen scroll>
        <View style={styles.emptyCard}>
          <Text style={styles.eyebrow}>Budget</Text>
          <Text style={styles.pageTitle}>No active month yet</Text>
          <Text style={styles.emptyText}>
            Start your month setup to unlock the dashboard.
          </Text>
        </View>
      </AppScreen>
    );
  }

  const rows: RowItem[] = [
    {
      label: 'Must',
      hint: 'Rent, groceries, bills',
      used: month.must_spent_cents,
      planned: month.must_budget_cents,
      color: colors.must,
    },
    {
      label: 'Want',
      hint: 'Food out, shopping, fun',
      used: month.want_spent_cents,
      planned: month.want_budget_cents,
      color: colors.want,
    },
    {
      label: 'Invest',
      hint: 'Savings and future goals',
      used: 0,
      planned: month.keep_budget_cents,
      color: colors.keep,
    },
  ];

  const totalSpent = month.must_spent_cents + month.want_spent_cents;
  const totalPlanned =
    month.must_budget_cents + month.want_budget_cents + month.keep_budget_cents;

  return (
    <View style={{ flex: 1 }}>
      <AppScreen scroll>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.eyebrow}>Budget intelligence</Text>
              <Text style={styles.pageTitle}>This month</Text>
            </View>

            <Pressable onPress={() => router.push('/expenses' as any)}>
              <Text style={styles.linkText}>View all</Text>
            </Pressable>
          </View>

          <Text style={styles.heroAmount}>
            {formatCentsToMoney(month.income_cents, currency)}
          </Text>
          <Text style={styles.heroSubtext}>Net income planned for this month</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(totalSpent, currency)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Planned</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(totalPlanned, currency)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Invest</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(month.keep_budget_cents, currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plan breakdown</Text>
        </View>

        {rows.map((row) => {
          const progress =
            row.planned > 0 ? Math.min((row.used / row.planned) * 100, 100) : 0;

          return (
            <View key={row.label} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View>
                  <Text style={styles.rowTitle}>{row.label}</Text>
                  <Text style={styles.rowHint}>{row.hint}</Text>
                </View>

                <View style={styles.amountBlock}>
                  <Text style={styles.amountMain}>
                    {formatCentsToMoney(row.used, currency)}
                  </Text>
                  <Text style={styles.amountSecondary}>
                    of {formatCentsToMoney(row.planned, currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${progress}%`,
                      backgroundColor: row.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </AppScreen>

      <Pressable
        onPress={() => router.push('/expense-new' as any)}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  heroSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  rowHint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amountMain: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  amountSecondary: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  track: {
    height: 8,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  fabText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '500',
    marginTop: -2,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});