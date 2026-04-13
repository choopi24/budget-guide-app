import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import {
  InvestmentForm,
  type InvestmentFormInitialData,
  type InvestmentFormValues,
} from '../components/InvestmentForm';
import { useInvestmentsDb } from '../db/investments';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { colors } from '../theme/colors';

export default function InvestmentNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefillName?: string;
    prefillAmountCents?: string;
  }>();

  const { createInvestment } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrency().then(setCurrency);
  }, [getCurrency]);

  const initialData = useMemo((): InvestmentFormInitialData | undefined => {
    if (!params.prefillName && !params.prefillAmountCents) return undefined;
    const amountCents = Number(params.prefillAmountCents ?? 0);
    const amountStr = amountCents > 0 ? String(amountCents / 100) : '';
    return {
      name: params.prefillName ?? '',
      category: 'ETF',
      assetSymbol: '',
      assetCoinId: '',
      assetQuantity: '',
      openingDate: new Date(),
      openingAmount: amountStr,
      currentValue: amountStr,
      note: '',
    };
  }, [params.prefillName, params.prefillAmountCents]);

  const fromExpense = !!params.prefillName || !!params.prefillAmountCents;

  async function handleSave(values: InvestmentFormValues) {
    setSaving(true);
    try {
      await createInvestment({
        name: values.name,
        category: values.category,
        assetSymbol: values.isCrypto ? values.assetSymbol : undefined,
        assetCoinId: values.isCrypto ? values.assetCoinId : undefined,
        assetQuantity: values.isMarketAsset && !values.isNew ? values.quantity : null,
        isNew: values.isNew,
        openingDate: values.openingDate,
        openingAmountCents: values.openingAmountCents,
        currentValueCents: values.currentValueCents,
        note: values.note,
      });
      router.replace('/(tabs)/savings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace('/(tabs)/home' as any)} hitSlop={10}>
          <Text style={styles.cancelText}>{fromExpense ? 'Skip' : 'Cancel'}</Text>
        </Pressable>
      </View>

      <InvestmentForm
        eyebrow="New investment"
        title={fromExpense ? 'Log your investment' : 'Document an investment'}
        subtitle={
          fromExpense
            ? 'Your expense was saved. Fill in the investment details below.'
            : "We'll ask different questions depending on the type."
        }
        showIsNew
        saveLabel="Save investment"
        saving={saving}
        currency={currency}
        initialData={initialData}
        onSave={handleSave}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { marginBottom: 10, alignItems: 'flex-end' },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});
