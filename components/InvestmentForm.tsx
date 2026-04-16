import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DatePickerField } from './DatePickerField';
import { type InvestmentCategory } from '../db/investments';
import type { SupportedCurrency } from '../db/settings';
import { parseMoneyToCents } from '../lib/money';
import { searchCoins, type CoinOption } from '../lib/coins';
import { colors } from '../theme/colors';

const CATEGORY_OPTIONS: InvestmentCategory[] = [
  'ETF',
  'Stock',
  'Crypto',
  'Real Estate',
  'Savings',
  'Fund',
  'Other',
];

const CURRENCY_LABEL: Record<SupportedCurrency, string> = {
  ILS: 'NIS',
  USD: 'USD',
  EUR: 'EUR',
};

export type InvestmentFormValues = {
  name: string;
  category: InvestmentCategory;
  assetSymbol: string;
  assetCoinId: string;
  quantity: number;
  isNew: boolean;
  openingDate: string;
  openingAmountCents: number;
  currentValueCents: number;
  note: string;
  isMarketAsset: boolean;
  isCrypto: boolean;
};

export type InvestmentFormInitialData = {
  name: string;
  category: InvestmentCategory;
  assetSymbol: string;
  assetCoinId: string;
  assetQuantity: string;
  openingDate: Date;
  openingAmount: string;
  currentValue: string;
  note: string;
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  showIsNew?: boolean;
  saveLabel: string;
  saving: boolean;
  currency?: SupportedCurrency;
  initialData?: InvestmentFormInitialData;
  onSave: (values: InvestmentFormValues) => void;
  onCancel?: () => void;
};

export function InvestmentForm({
  eyebrow,
  title,
  subtitle,
  showIsNew = false,
  saveLabel,
  saving,
  currency = 'ILS',
  initialData,
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [category, setCategory] = useState<InvestmentCategory>(
    initialData?.category ?? 'ETF'
  );
  const [assetSymbol, setAssetSymbol] = useState(initialData?.assetSymbol ?? '');
  const [assetCoinId, setAssetCoinId] = useState(initialData?.assetCoinId ?? '');
  const [assetQuantity, setAssetQuantity] = useState(
    initialData?.assetQuantity ?? ''
  );
  const [coinQuery, setCoinQuery] = useState(
    initialData?.assetSymbol && initialData?.assetCoinId
      ? `${initialData.assetSymbol} (${initialData.assetCoinId})`
      : ''
  );
  const [coinResults, setCoinResults] = useState<CoinOption[]>([]);

  const [isNew, setIsNew] = useState(true);
  const [openingDate, setOpeningDate] = useState(initialData?.openingDate ?? new Date());
  const [openingAmount, setOpeningAmount] = useState(initialData?.openingAmount ?? '');
  const [currentValue, setCurrentValue] = useState(initialData?.currentValue ?? '');
  const [note, setNote] = useState(initialData?.note ?? '');

  // Live price fetch states (existing crypto path)
  const [livePriceFetching, setLivePriceFetching] = useState(false);
  const [livePriceCents, setLivePriceCents] = useState<number | null>(null);
  const [livePriceError, setLivePriceError] = useState('');

  const openingAmountCents = useMemo(
    () => parseMoneyToCents(openingAmount),
    [openingAmount]
  );
  const currentValueCents = useMemo(
    () => parseMoneyToCents(currentValue),
    [currentValue]
  );
  const quantity = useMemo(() => Number(assetQuantity || 0), [assetQuantity]);

  const isCrypto = category === 'Crypto';

  // Auto-fetch live price for existing crypto when adding (not editing)
  useEffect(() => {
    const shouldAutoFetch = showIsNew && !isNew && isCrypto && assetCoinId && quantity > 0;
    if (!shouldAutoFetch) return;

    let cancelled = false;
    setLivePriceFetching(true);
    setLivePriceCents(null);
    setLivePriceError('');

    const vs = currency === 'USD' ? 'usd' : currency === 'EUR' ? 'eur' : 'ils';

    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(assetCoinId)}&vs_currencies=${vs}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const unitPrice = data?.[assetCoinId]?.[vs];
        if (typeof unitPrice === 'number') {
          const totalCents = Math.round(unitPrice * quantity * 100);
          setLivePriceCents(totalCents);
          setOpeningAmount((totalCents / 100).toString());
          setCurrentValue((totalCents / 100).toString());
        } else {
          setLivePriceError('No live price found for this coin.');
        }
      })
      .catch(() => {
        if (!cancelled) setLivePriceError('Failed to fetch live price.');
      })
      .finally(() => {
        if (!cancelled) setLivePriceFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assetCoinId, quantity, currency, isCrypto, isNew, showIsNew]);

  const isMarketAsset =
    category === 'Crypto' ||
    category === 'ETF' ||
    category === 'Stock' ||
    category === 'Fund';
  const isSavings = category === 'Savings';
  const isRealEstate = category === 'Real Estate';

  // For new investments: current value = opening amount, date = today
  const isNewFlow  = showIsNew && isNew;
  // "Already had it" — single "Value" field, no separate opening/current split
  const alreadyHad = showIsNew && !isNew;
  const needsQuantity = isMarketAsset && !(isCrypto && isNewFlow);
  const needsCurrentValue = !isNewFlow && !alreadyHad;
  const showDatePicker_ = !isNewFlow;

  const canSave =
    name.trim().length > 0 &&
    openingAmountCents > 0 &&
    (!needsCurrentValue || currentValueCents > 0) &&
    (!isCrypto || assetCoinId.trim().length > 0) &&
    !saving;

  const currencyLabel = CURRENCY_LABEL[currency];

  function handleCoinSearch(query: string) {
    setCoinQuery(query);
    if (query.trim().length >= 1) {
      setCoinResults(searchCoins(query));
    } else {
      setCoinResults([]);
    }
  }

  function selectCoin(item: CoinOption) {
    setAssetCoinId(item.id);
    setAssetSymbol(item.symbol.toUpperCase());
    setCoinQuery(`${item.name} (${item.symbol.toUpperCase()})`);
    setCoinResults([]);
    if (!name.trim()) {
      setName(item.name);
    }
  }

  function handleCategoryChange(option: InvestmentCategory) {
    setCategory(option);
    setAssetSymbol('');
    setAssetCoinId('');
    setAssetQuantity('');
    setCoinQuery('');
    setCoinResults([]);
    setOpeningAmount('');
    setCurrentValue('');
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      name,
      category,
      assetSymbol,
      assetCoinId,
      quantity,
      isNew,
      openingDate: isNewFlow ? new Date().toISOString() : openingDate.toISOString(),
      openingAmountCents,
      currentValueCents: (isNewFlow || alreadyHad) ? openingAmountCents : currentValueCents,
      note,
      isMarketAsset,
      isCrypto,
    });
  }

  function renderTypeQuestions() {
    // "Already had it" — all categories: show coin picker (crypto only) + single Value field
    if (alreadyHad) {
      return (
        <>
          {isCrypto && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Which coin is it?</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    value={coinQuery}
                    onChangeText={handleCoinSearch}
                    placeholder="Bitcoin, ETH, Solana..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.searchInput]}
                  />
                </View>
              </View>
              {coinResults.length > 0 && (
                <View style={styles.resultsCard}>
                  {coinResults.map((item) => (
                    <Pressable key={item.id} onPress={() => selectCoin(item)} style={styles.resultRow}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultMeta}>{item.symbol} · {item.id}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {!!assetCoinId && (
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>{assetSymbol} · {assetCoinId}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.label}>How much do you hold?</Text>
                <TextInput
                  value={assetQuantity}
                  onChangeText={setAssetQuantity}
                  placeholder="0.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </>
          )}
          <View style={styles.field}>
            <Text style={styles.label}>Value ({currencyLabel})</Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </>
      );
    }

    if (isCrypto) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Which coin is it?</Text>
            <View style={styles.searchRow}>
              <TextInput
                value={coinQuery}
                onChangeText={handleCoinSearch}
                placeholder="Bitcoin, ETH, Solana..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.searchInput]}
              />
            </View>
          </View>

          {coinResults.length > 0 && (
            <View style={styles.resultsCard}>
              {coinResults.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => selectCoin(item)}
                  style={styles.resultRow}
                >
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultMeta}>
                    {item.symbol} · {item.id}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!assetCoinId && (
            <View style={styles.selectedPill}>
              <Text style={styles.selectedPillText}>
                {assetSymbol} · {assetCoinId}
              </Text>
            </View>
          )}

          {/* Only show quantity for existing crypto */}
          {!isNewFlow && (
            <View style={styles.field}>
              <Text style={styles.label}>How much do you currently hold?</Text>
              <TextInput
                value={assetQuantity}
                onChangeText={setAssetQuantity}
                placeholder="0.5"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>
              {isNewFlow
                ? `Amount you're investing (${currencyLabel})`
                : `Opening value (${currencyLabel})`}
            </Text>
            {isNewFlow ? (
              <TextInput
                value={openingAmount}
                onChangeText={setOpeningAmount}
                placeholder="5000"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            ) : livePriceFetching ? (
              <View style={styles.inputButton}>
                <Text style={[styles.inputButtonText, { color: colors.textMuted }]}>
                  Fetching live price...
                </Text>
              </View>
            ) : livePriceCents !== null ? (
              <View style={[styles.inputButton, { backgroundColor: colors.surfaceSoft }]}>
                <Text style={styles.inputButtonText}>
                  {(livePriceCents / 100).toLocaleString()} {currencyLabel} · live price
                </Text>
              </View>
            ) : (
              <View style={styles.inputButton}>
                <Text style={[styles.inputButtonText, { color: colors.danger }]}>
                  {livePriceError || 'Select coin and enter quantity first'}
                </Text>
              </View>
            )}
          </View>

          {/* Only show current value for existing crypto */}
          {!isNewFlow && (
            <View style={styles.field}>
              <Text style={styles.label}>
                Current total value ({currencyLabel})
              </Text>
              {livePriceFetching ? (
                <View style={styles.inputButton}>
                  <Text style={[styles.inputButtonText, { color: colors.textMuted }]}>
                    Fetching live price...
                  </Text>
                </View>
              ) : (
                <TextInput
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  placeholder="5300"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              )}
            </View>
          )}
        </>
      );
    }

    if (isSavings) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>
              {isNewFlow
                ? `Opening deposit (${currencyLabel})`
                : `Opening amount (${currencyLabel})`}
            </Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="10000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          {!isNewFlow && (
            <View style={styles.field}>
              <Text style={styles.label}>Current balance ({currencyLabel})</Text>
              <TextInput
                value={currentValue}
                onChangeText={setCurrentValue}
                placeholder="12300"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          )}
        </>
      );
    }

    if (isRealEstate) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>
              Purchase / opening value ({currencyLabel})
            </Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="700000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          {!isNewFlow && (
            <View style={styles.field}>
              <Text style={styles.label}>
                Current estimated value ({currencyLabel})
              </Text>
              <TextInput
                value={currentValue}
                onChangeText={setCurrentValue}
                placeholder="850000"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          )}
        </>
      );
    }

    if (isMarketAsset) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>
              {isNewFlow ? 'Units purchased (optional)' : 'Units currently held (optional)'}
            </Text>
            <TextInput
              value={assetQuantity}
              onChangeText={setAssetQuantity}
              placeholder="12"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {isNewFlow
                ? `Amount invested (${currencyLabel})`
                : `Opening value / total invested (${currencyLabel})`}
            </Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          {!isNewFlow && (
            <View style={styles.field}>
              <Text style={styles.label}>Current total value ({currencyLabel})</Text>
              <TextInput
                value={currentValue}
                onChangeText={setCurrentValue}
                placeholder="5300"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          )}
        </>
      );
    }

    // Other
    return (
      <>
        <View style={styles.field}>
          <Text style={styles.label}>Opening value ({currencyLabel})</Text>
          <TextInput
            value={openingAmount}
            onChangeText={setOpeningAmount}
            placeholder="5000"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        {!isNewFlow && (
          <View style={styles.field}>
            <Text style={styles.label}>Current value ({currencyLabel})</Text>
            <TextInput
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="5300"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        )}
      </>
    );
  }

  return (
    <View style={styles.card}>
      {/* Close button */}
      {!!onCancel && (
        <Pressable
          onPress={onCancel}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      )}

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.body}>{subtitle}</Text>}

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="BTC wallet, S&P 500, savings account..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chipsWrap}>
          {CATEGORY_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => handleCategoryChange(option)}
              style={[styles.chip, category === option && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === option && styles.chipTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {showIsNew && (
        <View style={styles.field}>
          <Text style={styles.label}>Is this new or already existed?</Text>
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setIsNew(true)}
              style={[styles.segmentButton, isNew && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, isNew && styles.segmentTextActive]}>
                New
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsNew(false)}
              style={[styles.segmentButton, !isNew && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, !isNew && styles.segmentTextActive]}>
                Already had it
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {renderTypeQuestions()}

      {/* Date picker only for existing investments */}
      {showDatePicker_ && (
        <View style={styles.field}>
          <Text style={styles.label}>When did you first open / buy it?</Text>
          <DatePickerField value={openingDate} onChange={setOpeningDate} />
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.noteInput]}
          multiline
        />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityLabel={saveLabel}
        accessibilityState={{ disabled: !canSave }}
        style={({ pressed }) => [
          styles.button,
          (!canSave || pressed) && styles.buttonPressed,
          !canSave && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : saveLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.keep,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  field: { marginTop: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: { flex: 1 },
  resultsCard: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  resultMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  selectedPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  noteInput: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: colors.surfaceSoft },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: { backgroundColor: colors.surfaceSoft },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.primary },
  button: {
    marginTop: 26,
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { backgroundColor: colors.buttonDisabled },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
});
