import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import {
  InvestmentForm,
  type InvestmentFormInitialData,
  type InvestmentFormValues,
} from '../components/InvestmentForm';
import { useInvestmentsDb, type InvestmentCategory } from '../db/investments';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { colors } from '../theme/colors';

/** Normalize legacy stored values to current category labels. */
function normalizeCategory(raw: string): InvestmentCategory {
  const map: Record<string, InvestmentCategory> = {
    'Savings': 'Savings',
  };
  return (map[raw] ?? raw) as InvestmentCategory;
}

export default function InvestmentEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const investmentId = Number(params.id);

  const { getInvestmentById, updateInvestment } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();
  const [initialData, setInitialData] = useState<InvestmentFormInitialData | null>(null);
  const [currency,    setCurrency]    = useState<SupportedCurrency>('ILS');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [item, savedCurrency] = await Promise.all([
        getInvestmentById(investmentId),
        getCurrency(),
      ]);
      if (!mounted) return;
      if (item) {
        setInitialData({
          name:          item.name,
          category:      normalizeCategory(item.category),
          assetSymbol:   item.asset_symbol ?? '',
          assetCoinId:   item.asset_coin_id ?? '',
          assetQuantity: item.asset_quantity != null ? String(item.asset_quantity) : '',
          openingDate:   new Date(item.opening_date),
          openingAmount: String(item.opening_amount_cents / 100),
          currentValue:  String(item.current_value_cents / 100),
          note:          item.note ?? '',
        });
      }
      setCurrency(savedCurrency);
    }

    if (investmentId) load();
    return () => { mounted = false; };
  }, [investmentId, getInvestmentById, getCurrency]);

  async function handleSave(values: InvestmentFormValues) {
    setSaving(true);
    try {
      await updateInvestment({
        id:                 investmentId,
        name:               values.name,
        category:           values.category,
        assetSymbol:        values.assetSymbol || undefined,
        assetCoinId:        values.isCrypto ? values.assetCoinId : undefined,
        assetQuantity:      values.isMarketAsset ? values.quantity || null : null,
        openingDate:        values.openingDate,
        openingAmountCents: values.openingAmountCents,
        currentValueCents:  values.currentValueCents,
        note:               values.note,
      });
      router.replace(`/investment/${investmentId}` as any);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {initialData && (
        <InvestmentForm
          mode="existing"
          eyebrow="Edit investment"
          title="Update the details"
          saveLabel="Save changes"
          saving={saving}
          currency={currency}
          initialData={initialData}
          onSave={handleSave}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { marginBottom: 10, alignItems: 'flex-end' },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});
