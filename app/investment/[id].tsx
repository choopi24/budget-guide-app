import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { InvestmentLineChart } from '../../components/InvestmentLineChart';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SectionLabel } from '../../components/ui/SectionLabel';
import {
  useInvestmentDetailDb,
  type InvestmentDetail,
  type InvestmentUpdateRow,
  type InvestmentUpdateType,
} from '../../db/investment-detail';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { formatDateDisplay, formatShortDate } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function InvestmentDetailScreen() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ id: string }>();
  const investmentId = Number(params.id);

  const {
    getInvestmentDetail,
    getInvestmentUpdates,
    refreshCryptoCurrentValue,
    deleteInvestment,
  } = useInvestmentDetailDb();
  const { getCurrency } = useSettingsDb();

  const [detail, setDetail]               = useState<InvestmentDetail | null>(null);
  const [updates, setUpdates]             = useState<InvestmentUpdateRow[]>([]);
  const [currency, setCurrency]           = useState<SupportedCurrency>('ILS');
  const [refreshingPrice, setRefreshingPrice] = useState(false);
  const [refreshMessage, setRefreshMessage]   = useState('');
  const [loadError, setLoadError]             = useState(false);

  const load = useCallback(async () => {
    if (!investmentId) return;
    try {
      setLoadError(false);
      const [detailResult, updatesResult, savedCurrency] = await Promise.all([
        getInvestmentDetail(investmentId),
        getInvestmentUpdates(investmentId),
        getCurrency(),
      ]);
      setDetail(detailResult);
      setUpdates(updatesResult ?? []);
      setCurrency(savedCurrency);
    } catch {
      setLoadError(true);
    }
  }, [investmentId, getInvestmentDetail, getInvestmentUpdates, getCurrency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRefreshCrypto() {
    if (!detail || detail.category !== 'Crypto' || !detail.asset_coin_id || !detail.asset_quantity) return;
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

  if (loadError) {
    return (
      <AppScreen>
        <BackButton onPress={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} style={{ marginBottom: 12 }} />
          <Text style={styles.loadingText}>Could not load investment.</Text>
          <Pressable onPress={load} style={styles.retryLink} hitSlop={12}>
            <Text style={styles.retryLinkText}>Tap to retry</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (!detail) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </AppScreen>
    );
  }

  const totalPurchased  = updates.filter(u => u.type === 'buy').reduce((s, u) => s + (u.amount_cents ?? 0), 0);
  const totalSold       = updates.filter(u => u.type === 'sell').reduce((s, u) => s + (u.amount_cents ?? 0), 0);
  const totalCostBasis  = detail.opening_amount_cents + totalPurchased - totalSold;

  const gain    = detail.current_value_cents - totalCostBasis;
  const gainPct = totalCostBasis > 0 ? (gain / totalCostBasis) * 100 : 0;
  const isPos   = gain >= 0;

  const chartData = [...updates]
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
    .map((item) => ({ value: item.value_cents / 100, label: formatShortDate(item.effective_date) }));

  return (
    <AppScreen scroll>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />

        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push({ pathname: '/investment-edit' as any, params: { id: String(detail.id) } })}
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={handleDeleteInvestment}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* ── Hero section (open, no card) ── */}
      <View style={styles.hero}>
        <SectionLabel style={styles.heroEyebrow}>{detail.category}</SectionLabel>
        <Text style={styles.heroName}>{detail.name}</Text>
        {!!detail.asset_symbol && (
          <Text style={styles.heroSymbol}>
            {detail.asset_symbol}
            {detail.asset_quantity ? ` · ${detail.asset_quantity}` : ''}
          </Text>
        )}

        <Text style={styles.heroAmount}>
          {formatCentsToMoney(detail.current_value_cents, currency)}
        </Text>

        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>
            {formatCentsToMoney(totalCostBasis, currency)} invested
          </Text>
          <View style={styles.heroMetaDot} />
          <Text style={[styles.heroMetaGain, isPos ? styles.positive : styles.negative]}>
            {isPos ? '+' : '−'}
            {formatCentsToMoney(Math.abs(gain), currency)} ({isPos ? '+' : ''}
            {gainPct.toFixed(1)}%)
          </Text>
        </View>

        <Text style={styles.heroDate}>Opened {formatDateDisplay(detail.opening_date)}</Text>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionRow}>
        <Button
          label="Update value"
          size="md"
          onPress={() => router.push({ pathname: '/investment-value-update' as any, params: { id: String(detail.id) } })}
          style={styles.actionBtn}
        />
        <Button
          label="Add purchase"
          variant="secondary"
          size="md"
          onPress={() => router.push({ pathname: '/investment-purchase' as any, params: { id: String(detail.id) } })}
          style={styles.actionBtn}
        />
      </View>

      {/* ── Refresh crypto price ── */}
      {detail.category === 'Crypto' && detail.asset_coin_id && detail.asset_quantity && (
        <View style={styles.refreshRow}>
          <Button
            label={refreshingPrice ? 'Refreshing…' : 'Refresh live price'}
            variant="ghost"
            size="sm"
            fullWidth={false}
            loading={refreshingPrice}
            onPress={handleRefreshCrypto}
          />
          {!!refreshMessage && (
            <Text style={styles.refreshMsg}>{refreshMessage}</Text>
          )}
        </View>
      )}

      {/* ── Performance chart ── */}
      <Text style={styles.sectionLabel}>Performance</Text>
      <Card variant="outlined" padding={false} style={styles.chartCard}>
        <InvestmentLineChart data={chartData} currency={currency} />
      </Card>

      {/* ── History ── */}
      <Text style={styles.sectionLabel}>History</Text>
      <Card variant="outlined" padding={false} style={styles.historyCard}>
        {updates.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push({
                pathname: '/investment-update-edit' as any,
                params: { updateId: String(item.id), investmentId: String(investmentId) },
              })
            }
            style={({ pressed }) => [
              styles.historyRow,
              index !== 0 && styles.historyRowBorder,
              pressed && styles.historyRowPressed,
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.historyTopLine}>
                <Text style={styles.historyDate}>
                  {formatDateDisplay(item.effective_date)}
                </Text>
                <Text style={[styles.historyTypeBadge, { color: TYPE_COLOR[item.type ?? 'value_update'] }]}>
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
                <Text style={[styles.historyDelta, { color: item.type === 'sell' ? colors.danger : colors.primary }]}>
                  {item.type === 'sell' ? '−' : '+'}
                  {formatCentsToMoney(item.amount_cents, currency)}
                </Text>
              )}
            </View>

            <Ionicons name="chevron-forward" size={14} color={colors.border} style={{ marginLeft: spacing[1] }} />
          </Pressable>
        ))}
      </Card>

    </AppScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  retryLink: { marginTop: 12 },
  retryLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  topActions: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3] + 2,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[1],
  },
  heroEyebrow: {
    marginBottom: spacing[2],
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[1],
  },
  heroSymbol: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: '800',
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
    color: colors.textInverse,
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: spacing[3],
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
    marginBottom: spacing[2],
  },
  heroMetaText: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'], color: colors.textMuted },
  heroMetaDot: {
    width: 3, height: 3, borderRadius: 999, backgroundColor: colors.border,
  },
  heroMetaGain: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroDate:     { fontSize: 12, color: colors.textTertiary },
  positive:     { color: colors.primary },
  negative:     { color: colors.danger },

  // ── Actions ───────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2] + 2,
    marginBottom: spacing[4],
  },
  actionBtn: { flex: 1 },

  // ── Crypto refresh ────────────────────────────────────────────────────────
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  refreshMsg: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },

  // ── Chart ─────────────────────────────────────────────────────────────────
  chartCard: {
    overflow: 'hidden',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    marginBottom: spacing[5],
  },

  // ── History ───────────────────────────────────────────────────────────────
  historyCard: {
    overflow: 'hidden',
    marginBottom: spacing[6],
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  historyRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  historyRowPressed: { opacity: 0.6, transform: [{ scale: 0.99 }] },
  historyTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 3,
  },
  historyDate: { fontSize: 15, fontWeight: '600', color: colors.text },
  historyTypeBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  historyNote: { fontSize: 13, color: colors.textMuted },
  historyValueBlock: { alignItems: 'flex-end' },
  historyValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.text },
  historyDelta: { marginTop: 3, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
