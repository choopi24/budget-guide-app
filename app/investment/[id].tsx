import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { InvestmentLineChart } from '../../components/InvestmentLineChart';
import { useInvestmentDetailDb, type InvestmentDetail, type InvestmentUpdateRow, type InvestmentUpdateType } from '../../db/investment-detail';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { formatDateDisplay, formatShortDate } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';

const TYPE_LABEL: Record<InvestmentUpdateType, string> = {
  initial:      'Opened',
  buy:          'Added',
  sell:         'Withdrawn',
  value_update: 'Updated',
};

const TYPE_COLOR: Record<InvestmentUpdateType, string> = {
  initial:      colors.keep,
  buy:          colors.must,
  sell:         colors.danger,
  value_update: colors.textMuted,
};

export default function InvestmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const investmentId = Number(params.id);

  const {
    getInvestmentDetail,
    getInvestmentUpdates,
    refreshCryptoCurrentValue,
    deleteInvestment,
  } = useInvestmentDetailDb();
  const { getCurrency } = useSettingsDb();

  const [detail, setDetail] = useState<InvestmentDetail | null>(null);
  const [updates, setUpdates] = useState<InvestmentUpdateRow[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [refreshingPrice, setRefreshingPrice] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  const load = useCallback(async () => {
    if (!investmentId) return;

    const [detailResult, updatesResult, savedCurrency] = await Promise.all([
      getInvestmentDetail(investmentId),
      getInvestmentUpdates(investmentId),
      getCurrency(),
    ]);

    setDetail(detailResult);
    setUpdates(updatesResult ?? []);
    setCurrency(savedCurrency);
  }, [investmentId, getInvestmentDetail, getInvestmentUpdates, getCurrency]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefreshCrypto() {
    if (
      !detail ||
      detail.category !== 'Crypto' ||
      !detail.asset_coin_id ||
      !detail.asset_quantity
    ) {
      return;
    }

    setRefreshingPrice(true);
    setRefreshMessage('');

    try {
      await refreshCryptoCurrentValue({
        investmentId: detail.id,
        coinId: detail.asset_coin_id,
        quantity: detail.asset_quantity,
        currency,
      });

      setRefreshMessage('Live price updated.');
      await load();
    } catch (error: any) {
      setRefreshMessage(error?.message || 'Could not refresh live price.');
    } finally {
      setRefreshingPrice(false);
    }
  }

  function handleDeleteInvestment() {
    if (!detail) return;

    Alert.alert(
      'Delete investment',
      'This will remove the investment and its update history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteInvestment(detail.id);
            router.replace('/(tabs)/savings');
          },
        },
      ]
    );
  }

  if (!detail) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <Text style={styles.body}>Loading investment...</Text>
        </View>
      </AppScreen>
    );
  }

  const gain = detail.current_value_cents - detail.opening_amount_cents;
  const gainPct =
    detail.opening_amount_cents > 0
      ? (gain / detail.opening_amount_cents) * 100
      : 0;

  const chartData = [...updates]
    .sort(
      (a, b) =>
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    )
    .map((item) => ({
      value: item.value_cents / 100,
      label: formatShortDate(item.effective_date),
    }));

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        {/* Edit + Delete */}
        <View style={styles.topActions}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/investment-edit' as any,
                params: { id: String(detail.id) },
              })
            }
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={handleDeleteInvestment}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.eyebrow}>{detail.category}</Text>
            <Text style={styles.pageTitle}>{detail.name}</Text>
            {!!detail.asset_symbol && (
              <Text style={styles.symbolText}>
                {detail.asset_symbol}
                {detail.asset_quantity ? ` · ${detail.asset_quantity}` : ''}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.heroAmount}>
          {formatCentsToMoney(detail.current_value_cents, currency)}
        </Text>
        <Text style={styles.heroSubtext}>
          Opened {formatDateDisplay(detail.opening_date)}
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Start</Text>
            <Text style={styles.statValue}>
              {formatCentsToMoney(detail.opening_amount_cents, currency)}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Gain / loss</Text>
            <Text
              style={[
                styles.statValue,
                gain >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {gain >= 0 ? '+' : '-'}
              {formatCentsToMoney(Math.abs(gain), currency)}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Return</Text>
            <Text
              style={[
                styles.statValue,
                gain >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {gain >= 0 ? '+' : ''}
              {gainPct.toFixed(1)}%
            </Text>
          </View>
        </View>

        {detail.category === 'Crypto' &&
          detail.asset_coin_id &&
          detail.asset_quantity && (
            <>
              <Pressable
                onPress={handleRefreshCrypto}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {refreshingPrice ? 'Refreshing...' : 'Refresh live price'}
                </Text>
              </Pressable>

              {!!refreshMessage && (
                <Text style={styles.messageText}>{refreshMessage}</Text>
              )}
            </>
          )}

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/investment-update-new' as any,
              params: { id: String(detail.id) },
            })
          }
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Log Value Entry</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance</Text>
      </View>

      <View style={styles.chartCard}>
        <InvestmentLineChart data={chartData} currency={currency} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>History</Text>
      </View>

      <View style={styles.historyCard}>
        {updates.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.historyRow,
              index !== 0 && styles.historyRowBorder,
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.historyTopLine}>
                <Text style={styles.historyDate}>
                  {formatDateDisplay(item.effective_date)}
                </Text>
                <Text style={[styles.historyTypeLabel, { color: TYPE_COLOR[item.type ?? 'value_update'] }]}>
                  {TYPE_LABEL[item.type ?? 'value_update']}
                </Text>
              </View>
              {!!item.note && <Text style={styles.historyNote}>{item.note}</Text>}
            </View>
            <View style={styles.historyValueBlock}>
              <Text style={styles.historyValue}>
                {formatCentsToMoney(item.value_cents, currency)}
              </Text>
              {item.amount_cents != null && item.type !== 'initial' && (
                <Text style={[styles.historyAmount, { color: item.type === 'sell' ? colors.danger : colors.primary }]}>
                  {item.type === 'sell' ? '−' : '+'}
                  {formatCentsToMoney(item.amount_cents, currency)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
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
  symbolText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
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
    borderRadius: 16,
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
  positive: { color: colors.primary },
  negative: { color: colors.danger },
  secondaryButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  messageText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textMuted,
  },
  button: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  historyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  historyTypeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyNote: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  historyValueBlock: {
    alignItems: 'flex-end',
  },
  historyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  historyAmount: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
  },
});