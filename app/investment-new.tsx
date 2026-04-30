import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import {
  InvestmentForm,
  type FormMode,
  type InvestmentFormValues,
} from '../components/InvestmentForm';
import { useInvestmentsDb } from '../db/investments';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

// ── Path options ──────────────────────────────────────────────────────────────

type Path = 'existing' | 'budget' | 'balance';

const PATH_OPTIONS: {
  id: Path;
  title: string;
  description: string;
  icon: string;
  mode: FormMode;
  eyebrow: string;
  formTitle: string;
  formSubtitle: string;
}[] = [
  {
    id: 'existing',
    icon: '📊',
    title: 'Existing investment',
    description: 'Something I already own — import the cost basis and current value',
    mode: 'existing',
    eyebrow: 'Add investment',
    formTitle: 'Import an investment',
    formSubtitle: "Enter what you paid and what it's worth today.",
  },
  {
    id: 'budget',
    icon: '💰',
    title: 'New purchase',
    description: "Just bought it — optionally charge it to this month's Invest budget",
    mode: 'new-budget',
    eyebrow: 'Add investment',
    formTitle: 'Record a new purchase',
    formSubtitle: 'Enter the amount you invested today.',
  },
  {
    id: 'balance',
    icon: '🏦',
    title: 'Cash or savings',
    description: 'Track a savings account, emergency fund, or cash balance',
    mode: 'balance',
    eyebrow: 'Add balance',
    formTitle: 'Track a cash balance',
    formSubtitle: 'Enter the current amount in this account.',
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function InvestmentNewScreen() {
  const router = useRouter();

  const { createInvestment, createInvestmentWithExpense } = useInvestmentsDb();
  const { getCurrency } = useSettingsDb();
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [path,     setPath]     = useState<Path | null>(null);

  useEffect(() => { getCurrency().then(setCurrency); }, [getCurrency]);

  const selectedOption = PATH_OPTIONS.find(o => o.id === path) ?? null;

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
            assetSymbol:        values.assetSymbol || undefined,
            assetCoinId:        values.isCrypto ? values.assetCoinId : undefined,
            assetQuantity:      values.isMarketAsset ? values.quantity || null : null,
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
          assetSymbol:        values.assetSymbol || undefined,
          assetCoinId:        values.isCrypto ? values.assetCoinId : undefined,
          assetQuantity:      values.isMarketAsset ? values.quantity || null : null,
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
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (path ? setPath(null) : router.back())}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={path ? 'Back to path selection' : 'Cancel'}
        >
          <Text style={styles.cancelText}>{path ? '← Back' : 'Cancel'}</Text>
        </Pressable>
      </View>

      {/* ── Step 1: Path selector ── */}
      {!path && (
        <View>
          <Text style={styles.selectorTitle}>What are you adding?</Text>
          <Text style={styles.selectorSubtitle}>
            Choose how this investment fits your situation.
          </Text>
          <View style={styles.pathList}>
            {PATH_OPTIONS.map(option => (
              <Pressable
                key={option.id}
                onPress={() => setPath(option.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.pathCard,
                  pressed && styles.pathCardPressed,
                ]}
              >
                <Text style={styles.pathIcon}>{option.icon}</Text>
                <View style={styles.pathTextBlock}>
                  <Text style={styles.pathTitle}>{option.title}</Text>
                  <Text style={styles.pathDescription}>{option.description}</Text>
                </View>
                <Text style={styles.pathChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ── Step 2: Form ── */}
      {path && selectedOption && (
        <InvestmentForm
          mode={selectedOption.mode}
          eyebrow={selectedOption.eyebrow}
          title={selectedOption.formTitle}
          subtitle={selectedOption.formSubtitle}
          saveLabel="Save investment"
          saving={saving}
          currency={currency}
          onSave={handleSave}
        />
      )}

      {!!error && (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </AppScreen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[5],
    alignItems: 'flex-start',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // ── Path selector ──────────────────────────────────────────────────────────
  selectorTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
  },
  selectorSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing[6],
  },
  pathList: {
    gap: spacing[3],
  },
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pathCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  pathIcon: {
    fontSize: 28,
    lineHeight: 36,
  },
  pathTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  pathDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  pathChevron: {
    fontSize: 22,
    color: colors.textTertiary,
    fontWeight: '300',
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorWrap: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[5],
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
});
