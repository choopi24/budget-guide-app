import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import {
  InvestmentForm,
  type InvestmentFormValues,
} from '../components/InvestmentForm';
import { useInvestmentsDb } from '../db/investments';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { colors } from '../theme/colors';

export default function InvestmentNewScreen() {
  const router = useRouter();

  const { createInvestment, createInvestmentWithExpense } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCurrency().then(setCurrency);
  }, [getCurrency]);

  async function handleSave(values: InvestmentFormValues) {
    setSaving(true);
    setError('');
    try {
      if (values.fundedFromBudget) {
        await createInvestmentWithExpense({
          pendingExpense: {
            title:       values.name,
            amountCents: values.openingAmountCents,
            spentOn:     values.openingDate,
            note:        values.note || undefined,
          },
          investment: {
            name:               values.name,
            category:           values.category,
            assetSymbol:        values.isCrypto ? values.assetSymbol : undefined,
            assetCoinId:        values.isCrypto ? values.assetCoinId : undefined,
            assetQuantity:      values.isMarketAsset && !values.isNew ? values.quantity : null,
            isNew:              values.isNew,
            openingDate:        values.openingDate,
            openingAmountCents: values.openingAmountCents,
            currentValueCents:  values.currentValueCents,
            note:               values.note,
          },
        });
      } else {
        await createInvestment({
          name:               values.name,
          category:           values.category,
          assetSymbol:        values.isCrypto ? values.assetSymbol : undefined,
          assetCoinId:        values.isCrypto ? values.assetCoinId : undefined,
          assetQuantity:      values.isMarketAsset && !values.isNew ? values.quantity : null,
          isNew:              values.isNew,
          openingDate:        values.openingDate,
          openingAmountCents: values.openingAmountCents,
          currentValueCents:  values.currentValueCents,
          note:               values.note,
        });
      }
      router.replace('/(tabs)/savings');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen scroll>
      <InvestmentForm
        eyebrow="New investment"
        title="Document an investment"
        subtitle="We'll ask different questions depending on the type."
        showIsNew
        showFundedFromBudget
        saveLabel="Save investment"
        saving={saving}
        currency={currency}
        onSave={handleSave}
        onCancel={() => router.replace('/(tabs)/home' as any)}
      />
      {!!error && (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
});
