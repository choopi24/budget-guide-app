import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useInvestmentsDb } from '../../db/investments';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { formatDateDisplay } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';

type InvestmentItem = {
  id: number;
  name: string;
  category: string;
  opening_amount_cents: number;
  current_value_cents: number;
  opening_date: string;
  note: string | null;
};

export default function SavingsScreen() {
  const router = useRouter();
  const { getInvestmentsList } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();

  const [items, setItems] = useState<InvestmentItem[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  const load = useCallback(async () => {
    const [result, savedCurrency] = await Promise.all([
      getInvestmentsList(),
      getCurrency(),
    ]);

    setItems(result as InvestmentItem[]);
    setCurrency(savedCurrency);
  }, [getInvestmentsList, getCurrency]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalCurrent = items.reduce((sum, item) => sum + item.current_value_cents, 0);
  const totalOpening = items.reduce((sum, item) => sum + item.opening_amount_cents, 0);
  const totalGain = totalCurrent - totalOpening;

  return (
    <View style={{ flex: 1 }}>
      <AppScreen scroll>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.eyebrow}>Portfolio</Text>
              <Text style={styles.pageTitle}>Invest</Text>
            </View>

            <View style={styles.livePill}>
              <Text style={styles.livePillText}>{items.length} items</Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>
            {formatCentsToMoney(totalCurrent, currency)}
          </Text>
          <Text style={styles.heroSubtext}>Current tracked value</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Starting</Text>
              <Text style={styles.statValue}>
                {formatCentsToMoney(totalOpening, currency)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Gain / loss</Text>
              <Text
                style={[
                  styles.statValue,
                  totalGain >= 0 ? styles.positive : styles.negative,
                ]}
              >
                {totalGain >= 0 ? '+' : '-'}
                {formatCentsToMoney(Math.abs(totalGain), currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tracked investments</Text>
          <Text style={styles.sectionCaption}>Manual and clear</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No investments yet</Text>
            <Text style={styles.emptyBody}>
              Add an old investment manually, or document one directly from an expense.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const gain = item.current_value_cents - item.opening_amount_cents;

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/investment/${item.id}` as any)}
                style={({ pressed }) => [
                  styles.itemCard,
                  pressed && styles.itemCardPressed,
                ]}
              >
                <View style={styles.itemTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.category} · {formatDateDisplay(item.opening_date)}
                    </Text>
                  </View>

                  <View style={styles.itemValueBlock}>
                    <Text style={styles.itemValue}>
                      {formatCentsToMoney(item.current_value_cents, currency)}
                    </Text>
                    <Text
                      style={[
                        styles.itemGain,
                        gain >= 0 ? styles.positive : styles.negative,
                      ]}
                    >
                      {gain >= 0 ? '+' : '-'}
                      {formatCentsToMoney(Math.abs(gain), currency)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </AppScreen>

      <Pressable
        onPress={() => router.push('/investment-new' as any)}
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
    color: colors.keep,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  livePill: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  livePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.keep,
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
  sectionCaption: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
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
  itemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
  },
  itemCardPressed: {
    opacity: 0.93,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  itemMeta: {
    marginTop: 5,
    fontSize: 13,
    color: colors.textMuted,
  },
  itemValueBlock: {
    alignItems: 'flex-end',
  },
  itemValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  itemGain: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  positive: {
    color: colors.primary,
  },
  negative: {
    color: '#B6523A',
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
});