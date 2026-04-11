import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useInvestmentsDb,
  type InvestmentCategory,
} from '../db/investments';
import { AppScreen } from '../components/AppScreen';
import { formatDateDisplay } from '../lib/date';
import { parseMoneyToCents } from '../lib/money';
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

type CoinOption = {
  id: string;
  symbol: string;
  name: string;
};

export default function InvestmentNewScreen() {
  const router = useRouter();
  const { createInvestment } = useInvestmentsDb();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<InvestmentCategory>('ETF');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetCoinId, setAssetCoinId] = useState('');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [coinQuery, setCoinQuery] = useState('');
  const [coinResults, setCoinResults] = useState<CoinOption[]>([]);
  const [coinLoading, setCoinLoading] = useState(false);

  const [isNew, setIsNew] = useState(true);
  const [openingDate, setOpeningDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

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
  const isMarketAsset = category === 'Crypto' || category === 'ETF' || category === 'Stock' || category === 'Fund';
  const isSavings = category === 'Savings';
  const isRealEstate = category === 'Real Estate';

  const canSave =
    name.trim().length > 0 &&
    openingAmountCents > 0 &&
    currentValueCents > 0 &&
    (!isCrypto || assetCoinId.trim().length > 0) &&
    (!isCrypto || quantity > 0) &&
    (!isMarketAsset || quantity > 0) &&
    !saving;

  async function searchCoins() {
    if (!coinQuery.trim()) return;

    setCoinLoading(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
      const data = (await response.json()) as CoinOption[];

      const query = coinQuery.trim().toLowerCase();

      const filtered = data
        .filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.symbol.toLowerCase().includes(query)
        )
        .slice(0, 12);

      setCoinResults(filtered);
    } finally {
      setCoinLoading(false);
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

  function renderTypeQuestions() {
    if (isCrypto) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Which coin is it?</Text>
            <View style={styles.searchRow}>
              <TextInput
                value={coinQuery}
                onChangeText={setCoinQuery}
                placeholder="Search Bitcoin, ETH, Solana..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.searchInput]}
              />
              <Pressable onPress={searchCoins} style={styles.searchButton}>
                <Text style={styles.searchButtonText}>
                  {coinLoading ? '...' : 'Find'}
                </Text>
              </Pressable>
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
                    {item.symbol.toUpperCase()} · {item.id}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!assetCoinId && (
            <Text style={styles.selectedText}>
              Selected: {assetSymbol} · {assetCoinId}
            </Text>
          )}

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

          <View style={styles.field}>
            <Text style={styles.label}>
              {isNew ? 'How much are you putting in now?' : 'What was your original total cost / opening value?'}
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

          <View style={styles.field}>
            <Text style={styles.label}>What is the current total value now?</Text>
            <TextInput
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="5300"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </>
      );
    }

    if (isSavings) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>What was the opening amount?</Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="10000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>What is the current balance?</Text>
            <TextInput
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="12300"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </>
      );
    }

    if (isRealEstate) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>What was the purchase / opening value?</Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="700000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>What is the current estimated value?</Text>
            <TextInput
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="850000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </>
      );
    }

    if (isMarketAsset) {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>How many units do you currently hold?</Text>
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
              {isNew ? 'How much are you investing now?' : 'What was your opening value / total invested?'}
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

          <View style={styles.field}>
            <Text style={styles.label}>What is the current total value?</Text>
            <TextInput
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="5300"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.field}>
          <Text style={styles.label}>What was the opening value?</Text>
          <TextInput
            value={openingAmount}
            onChangeText={setOpeningAmount}
            placeholder="5000"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What is the current value?</Text>
          <TextInput
            value={currentValue}
            onChangeText={setCurrentValue}
            placeholder="5300"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      </>
    );
  }

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);

    try {
      await createInvestment({
        name,
        category,
        assetSymbol: isCrypto ? assetSymbol : undefined,
        assetCoinId: isCrypto ? assetCoinId : undefined,
        assetQuantity: isMarketAsset ? quantity : null,
        isNew,
        openingDate: openingDate.toISOString(),
        openingAmountCents,
        currentValueCents,
        note,
      });

      router.replace('/(tabs)/savings');
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

      <View style={styles.card}>
        <Text style={styles.eyebrow}>New investment</Text>
        <Text style={styles.title}>Document an investment</Text>
        <Text style={styles.body}>
          We’ll ask different questions depending on the type.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>What should this investment be called?</Text>
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
                onPress={() => {
                  setCategory(option);
                  setAssetSymbol('');
                  setAssetCoinId('');
                  setAssetQuantity('');
                  setCoinQuery('');
                  setCoinResults([]);
                  setOpeningAmount('');
                  setCurrentValue('');
                }}
                style={[
                  styles.chip,
                  category === option && styles.chipActive,
                ]}
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

        <View style={styles.field}>
          <Text style={styles.label}>Is this new or something older you already had?</Text>
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setIsNew(true)}
              style={[
                styles.segmentButton,
                isNew && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isNew && styles.segmentTextActive,
                ]}
              >
                New
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setIsNew(false)}
              style={[
                styles.segmentButton,
                !isNew && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  !isNew && styles.segmentTextActive,
                ]}
              >
                Existing
              </Text>
            </Pressable>
          </View>
        </View>

        {renderTypeQuestions()}

        <View style={styles.field}>
          <Text style={styles.label}>
            {isNew ? 'When did this start?' : 'When did you first open / buy it?'}
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.inputButton}
          >
            <Text style={styles.inputButtonText}>
              {formatDateDisplay(openingDate.toISOString())}
            </Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={openingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setOpeningDate(selectedDate);
                }
              }}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <View style={styles.inlinePickerFooter}>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>

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
          style={({ pressed }) => [
            styles.button,
            (!canSave || pressed) && styles.buttonPressed,
            !canSave && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Save investment'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { marginBottom: 10, alignItems: 'flex-end' },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.keep,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.textMuted },
  field: { marginTop: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
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
  searchInput: {
    flex: 1,
  },
  searchButton: {
    minWidth: 72,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  searchButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  resultsCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  resultMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  selectedText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  inputButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputButtonText: { fontSize: 16, color: colors.text },
  inlinePickerFooter: { alignItems: 'flex-end', marginTop: 8 },
  smallButton: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallButtonText: { color: colors.text, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.text },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  segmentText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  button: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { backgroundColor: '#9DB8AA' },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});