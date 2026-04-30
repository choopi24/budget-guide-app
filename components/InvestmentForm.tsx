import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DatePickerField } from './DatePickerField';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { type InvestmentCategory } from '../db/investments';
import type { SupportedCurrency } from '../db/settings';
import { parseMoneyToCents } from '../lib/money';
import { searchCoins, type CoinOption } from '../lib/coins';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

// ── Category config ───────────────────────────────────────────────────────────

const ALL_CATEGORIES: InvestmentCategory[] = [
  'ETF', 'Stock', 'Crypto', 'Fund', 'Real Estate', 'Savings', 'Other',
];

// Shown when adding via "existing" or "budget" path — Savings has its own path
const NON_SAVINGS_CATEGORIES: InvestmentCategory[] = [
  'ETF', 'Stock', 'Crypto', 'Fund', 'Real Estate', 'Other',
];

const CATEGORY_LABEL: Record<InvestmentCategory, string> = {
  ETF:           'ETF',
  Stock:         'Stock',
  Crypto:        'Crypto',
  Fund:          'Fund',
  'Real Estate': 'Real Estate',
  Savings:       'Savings / Cash',
  Other:         'Other',
};

const CURRENCY_LABEL: Record<SupportedCurrency, string> = {
  ILS: 'NIS', USD: 'USD', EUR: 'EUR',
};

// ── Public types ──────────────────────────────────────────────────────────────

/** How this investment is being added. Drives which fields are shown. */
export type FormMode = 'new-budget' | 'existing' | 'balance';

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
  fundedFromBudget: boolean;
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
  mode?: FormMode;
  eyebrow: string;
  title: string;
  subtitle?: string;
  saveLabel: string;
  saving: boolean;
  currency?: SupportedCurrency;
  initialData?: InvestmentFormInitialData;
  onSave: (values: InvestmentFormValues) => void;
  onCancel?: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function InvestmentForm({
  mode = 'existing',
  eyebrow,
  title,
  subtitle,
  saveLabel,
  saving,
  currency = 'ILS',
  initialData,
  onSave,
  onCancel,
}: Props) {
  const isBalanceMode  = mode === 'balance';
  const isBudgetMode   = mode === 'new-budget';
  const isExistingMode = mode === 'existing';
  const isEditing      = !!initialData;

  // ── State ─────────────────────────────────────────────────────────────────
  const [name,         setName]         = useState(initialData?.name ?? '');
  const [category,     setCategory]     = useState<InvestmentCategory>(
    isBalanceMode ? 'Savings' : (initialData?.category ?? 'ETF')
  );
  const [assetSymbol,  setAssetSymbol]  = useState(initialData?.assetSymbol ?? '');
  const [assetCoinId,  setAssetCoinId]  = useState(initialData?.assetCoinId ?? '');
  const [assetQuantity,setAssetQuantity]= useState(initialData?.assetQuantity ?? '');
  const [coinQuery,    setCoinQuery]    = useState(
    initialData?.assetSymbol && initialData?.assetCoinId
      ? `${initialData.assetSymbol} (${initialData.assetCoinId})`
      : ''
  );
  const [coinResults,      setCoinResults]      = useState<CoinOption[]>([]);
  const [fundedFromBudget, setFundedFromBudget] = useState(isBudgetMode);
  const [openingDate,      setOpeningDate]      = useState<Date>(initialData?.openingDate ?? new Date());
  const [openingAmount,    setOpeningAmount]    = useState(initialData?.openingAmount ?? '');
  const [currentValue,     setCurrentValue]     = useState(initialData?.currentValue ?? '');
  const [note,             setNote]             = useState(initialData?.note ?? '');
  const [triedSave,        setTriedSave]        = useState(false);

  // Live price (new existing-mode crypto only)
  const [livePriceFetching, setLivePriceFetching] = useState(false);
  const [livePriceCents,    setLivePriceCents]    = useState<number | null>(null);
  const [livePriceError,    setLivePriceError]    = useState('');

  // ── Derived ───────────────────────────────────────────────────────────────
  const isCrypto       = category === 'Crypto';
  const isSavings      = category === 'Savings';
  const isRealEstate   = category === 'Real Estate';
  const isMarketAsset  = ['Crypto', 'ETF', 'Stock', 'Fund'].includes(category);
  const hasTickerField = ['ETF', 'Stock', 'Fund'].includes(category);

  const openingAmountCents = useMemo(() => parseMoneyToCents(openingAmount), [openingAmount]);
  const currentValueCents  = useMemo(() => parseMoneyToCents(currentValue),  [currentValue]);
  const quantity           = useMemo(() => Number(assetQuantity || 0),         [assetQuantity]);
  const currencyLabel      = CURRENCY_LABEL[currency];

  // balance / budget modes: current value equals opening amount
  const resolvedCurrentValueCents = isExistingMode ? currentValueCents : openingAmountCents;

  // Which category chips to show
  const categoryOptions: InvestmentCategory[] =
    isBalanceMode ? [] :
    isEditing     ? ALL_CATEGORIES :
    NON_SAVINGS_CATEGORIES;

  // ── Validation ────────────────────────────────────────────────────────────
  const errors = {
    name: !name.trim() ? 'Name is required' : null,
    openingAmount: openingAmountCents <= 0 ? (
      isBalanceMode ? 'Balance is required' :
      isBudgetMode  ? 'Amount invested is required' :
                      'Amount invested / cost basis is required'
    ) : null,
    currentValue: isExistingMode && currentValueCents <= 0
      ? 'Current value is required'
      : null,
    coinId: isCrypto && !assetCoinId ? 'Please select a coin' : null,
  };

  const canSave = !errors.name && !errors.openingAmount && !errors.currentValue && !errors.coinId && !saving;

  function fieldError(key: keyof typeof errors): string | null {
    return triedSave ? errors[key] : null;
  }

  // ── Auto-fetch live price for new existing crypto ─────────────────────────
  useEffect(() => {
    if (isEditing || !isExistingMode || !isCrypto || !assetCoinId || quantity <= 0) return;

    let cancelled = false;
    setLivePriceFetching(true);
    setLivePriceCents(null);
    setLivePriceError('');

    const vs = currency === 'USD' ? 'usd' : currency === 'EUR' ? 'eur' : 'ils';

    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(assetCoinId)}&vs_currencies=${vs}`
    )
      .then(r => r.json())
      .then(data => {
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
      .catch(() => { if (!cancelled) setLivePriceError('Failed to fetch live price.'); })
      .finally(() => { if (!cancelled) setLivePriceFetching(false); });

    return () => { cancelled = true; };
  }, [assetCoinId, quantity, currency, isCrypto, isExistingMode, isEditing]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleCoinSearch(query: string) {
    setCoinQuery(query);
    setCoinResults(query.trim().length >= 1 ? searchCoins(query) : []);
  }

  function selectCoin(item: CoinOption) {
    setAssetCoinId(item.id);
    setAssetSymbol(item.symbol.toUpperCase());
    setCoinQuery(`${item.name} (${item.symbol.toUpperCase()})`);
    setCoinResults([]);
    if (!name.trim()) setName(item.name);
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
    setTriedSave(true);
    if (!canSave) return;
    onSave({
      name,
      category,
      assetSymbol,
      assetCoinId,
      quantity,
      isNew: isBudgetMode,
      openingDate: isBudgetMode ? new Date().toISOString() : openingDate.toISOString(),
      openingAmountCents,
      currentValueCents: resolvedCurrentValueCents,
      note,
      isMarketAsset,
      isCrypto,
      fundedFromBudget: isBudgetMode ? fundedFromBudget : false,
    });
  }

  // ── Amount/value field renderer ───────────────────────────────────────────
  function renderAmountFields() {
    if (isBalanceMode) {
      return (
        <View style={styles.field}>
          <Text style={styles.label}>Current balance ({currencyLabel})</Text>
          <TextInput
            value={openingAmount}
            onChangeText={setOpeningAmount}
            placeholder="10 000"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, !!fieldError('openingAmount') && styles.inputError]}
          />
          {!!fieldError('openingAmount') && (
            <Text style={styles.errorMsg}>{fieldError('openingAmount')}</Text>
          )}
        </View>
      );
    }

    if (isBudgetMode) {
      return (
        <View style={styles.field}>
          <Text style={styles.label}>Amount invested ({currencyLabel})</Text>
          <TextInput
            value={openingAmount}
            onChangeText={setOpeningAmount}
            placeholder="5 000"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, !!fieldError('openingAmount') && styles.inputError]}
          />
          {!!fieldError('openingAmount') && (
            <Text style={styles.errorMsg}>{fieldError('openingAmount')}</Text>
          )}
        </View>
      );
    }

    // Existing mode: cost basis + current value
    const costBasisLabel =
      isSavings    ? `Opening deposit (${currencyLabel})` :
      isRealEstate ? `Purchase price (${currencyLabel})` :
                     `Amount invested / cost basis (${currencyLabel})`;

    const currentValueLabel =
      isSavings    ? `Current balance (${currencyLabel})` :
      isRealEstate ? `Current estimated value (${currencyLabel})` :
                     `Current value (${currencyLabel})`;

    return (
      <>
        <View style={styles.field}>
          <Text style={styles.label}>{costBasisLabel}</Text>
          {isCrypto && livePriceFetching ? (
            <View style={styles.inputPlaceholder}>
              <Text style={styles.inputPlaceholderText}>Fetching live price…</Text>
            </View>
          ) : isCrypto && livePriceCents !== null && !livePriceError ? (
            <View style={[styles.inputPlaceholder, styles.inputPlaceholderFilled]}>
              <Text style={styles.inputPlaceholderFilledText}>
                {(livePriceCents / 100).toLocaleString()} {currencyLabel} · live
              </Text>
            </View>
          ) : isCrypto && !assetCoinId ? (
            <View style={styles.inputPlaceholder}>
              <Text style={styles.inputPlaceholderText}>
                Select coin and enter quantity first
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                value={openingAmount}
                onChangeText={setOpeningAmount}
                placeholder={isRealEstate ? '700 000' : '5 000'}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, !!fieldError('openingAmount') && styles.inputError]}
              />
              {!!fieldError('openingAmount') && (
                <Text style={styles.errorMsg}>{fieldError('openingAmount')}</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{currentValueLabel}</Text>
          {isCrypto && livePriceFetching ? (
            <View style={styles.inputPlaceholder}>
              <Text style={styles.inputPlaceholderText}>Fetching live price…</Text>
            </View>
          ) : (
            <>
              <TextInput
                value={currentValue}
                onChangeText={setCurrentValue}
                placeholder={isRealEstate ? '850 000' : '5 300'}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, !!fieldError('currentValue') && styles.inputError]}
              />
              {!!fieldError('currentValue') && (
                <Text style={styles.errorMsg}>{fieldError('currentValue')}</Text>
              )}
            </>
          )}
        </View>

        {isCrypto && !!livePriceError && (
          <Text style={[styles.errorMsg, { marginTop: spacing[2] }]}>{livePriceError}</Text>
        )}
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {!!onCancel && (
        <Pressable
          onPress={onCancel}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      )}

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.body}>{subtitle}</Text>}

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={
            isBalanceMode
              ? 'Savings account, emergency fund…'
              : isCrypto
              ? 'BTC wallet, ETH portfolio…'
              : 'S&P 500, AAPL, my fund…'
          }
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, !!fieldError('name') && styles.inputError]}
        />
        {!!fieldError('name') && <Text style={styles.errorMsg}>{fieldError('name')}</Text>}
      </View>

      {/* Type chips */}
      {categoryOptions.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipsWrap}>
            {categoryOptions.map(option => (
              <Chip
                key={option}
                label={CATEGORY_LABEL[option]}
                active={category === option}
                activeColor={colors.primary}
                activeBgColor={colors.surfaceSoft}
                onPress={() => handleCategoryChange(option)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Crypto: coin picker + quantity */}
      {isCrypto && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Coin</Text>
            <TextInput
              value={coinQuery}
              onChangeText={handleCoinSearch}
              placeholder="Bitcoin, ETH, Solana…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, !!fieldError('coinId') && styles.inputError]}
            />
            {!!fieldError('coinId') && (
              <Text style={styles.errorMsg}>{fieldError('coinId')}</Text>
            )}
          </View>
          {coinResults.length > 0 && (
            <View style={styles.resultsCard}>
              {coinResults.map(item => (
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
            <Text style={styles.label}>
              Quantity{'  '}<Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              value={assetQuantity}
              onChangeText={setAssetQuantity}
              placeholder="0.5"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>
        </>
      )}

      {/* ETF / Stock / Fund: ticker + units */}
      {hasTickerField && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>
              Ticker / symbol{'  '}<Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              value={assetSymbol}
              onChangeText={t => setAssetSymbol(t.toUpperCase())}
              placeholder={
                category === 'ETF'   ? 'VOO, QQQ…' :
                category === 'Stock' ? 'AAPL, TSLA…' : 'Symbol…'
              }
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              Units held{'  '}<Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              value={assetQuantity}
              onChangeText={setAssetQuantity}
              placeholder="12"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>
        </>
      )}

      {/* Amount / value fields */}
      {renderAmountFields()}

      {/* Date picker — existing and balance modes */}
      {!isBudgetMode && (
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBalanceMode
              ? 'Date opened (optional)'
              : 'Date acquired / first invested'}
          </Text>
          <DatePickerField value={openingDate} onChange={setOpeningDate} />
        </View>
      )}

      {/* Funded from budget toggle — budget mode only */}
      {isBudgetMode && (
        <View style={styles.fundedRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fundedLabel}>{"Funded from this month's budget?"}</Text>
            <Text style={styles.fundedHint}>Counts toward your monthly Invest budget.</Text>
          </View>
          <Switch
            value={fundedFromBudget}
            onValueChange={setFundedFromBudget}
            trackColor={{ false: colors.border, true: colors.keep + 'CC' }}
            thumbColor={fundedFromBudget ? colors.keep : colors.white}
            accessibilityLabel="Funded from this month's budget"
          />
        </View>
      )}

      {/* Note */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Note{'  '}<Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, styles.noteInput]}
          multiline
        />
      </View>

      <Button
        label={saving ? 'Saving…' : saveLabel}
        onPress={handleSave}
        disabled={saving}
        loading={saving}
        style={{ marginTop: spacing[6] }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[6],
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[1],
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  field: { marginTop: spacing[5] },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  optional: {
    fontWeight: '400',
    color: colors.textTertiary,
    fontSize: 13,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  errorMsg: {
    marginTop: spacing[1],
    fontSize: 13,
    fontWeight: '500',
    color: colors.danger,
  },
  inputPlaceholder: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
  },
  inputPlaceholderText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
  },
  inputPlaceholderFilled: {
    backgroundColor: colors.surfaceSoft,
  },
  inputPlaceholderFilledText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  noteInput: {
    minHeight: 96,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  resultsCard: {
    marginTop: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resultRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  resultMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  selectedPill: {
    marginTop: spacing[3],
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  selectedPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
  fundedRow: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fundedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  fundedHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textTertiary,
  },
});
