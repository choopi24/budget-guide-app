import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useExpensesDb } from '../db/expenses';
import { formatDateDisplay } from '../lib/date';
import { detectExpenseBucket, ExpenseBucket } from '../lib/expenseClassifier';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useExpensesDb();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [spentOn, setSpentOn] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bucket, setBucket] = useState<ExpenseBucket>('want');
  const [saving, setSaving] = useState(false);

  const [isInvestmentTransfer, setIsInvestmentTransfer] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const suggestedBucket = useMemo(() => detectExpenseBucket(title), [title]);
  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);

  const canSave =
    title.trim().length > 0 &&
    amountCents > 0 &&
    !saving;

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);

    try {
      await addExpense({
        title,
        amountCents,
        spentOn: spentOn.toISOString(),
        note,
        finalBucket: bucket,
        createInvestmentRecord: isInvestmentTransfer,
        isRecurring,
      });

      if (isInvestmentTransfer) {
        router.replace({
          pathname: '/investment-new' as any,
          params: {
            prefillName: title,
            prefillAmountCents: String(amountCents),
          },
        });
      } else {
        router.replace('/(tabs)/home');
      }
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
        <Text style={styles.eyebrow}>Expense</Text>
        <Text style={styles.title}>Log a new entry</Text>
        <Text style={styles.body}>
          Track a spend, or mark it as money moved into an investment.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>What was it for?</Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setBucket(detectExpenseBucket(text));
            }}
            placeholder="Groceries, ETF transfer, dinner..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="120"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.inputButton}
          >
            <Text style={styles.inputButtonText}>
              {formatDateDisplay(spentOn.toISOString())}
            </Text>
          </Pressable>

          {showDatePicker && (
            <View style={Platform.OS === 'ios' ? styles.pickerContainer : undefined}>
              <DateTimePicker
                value={spentOn}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={colors.text}
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (selectedDate) setSpentOn(selectedDate);
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.inlinePickerFooter}>
                  <Pressable onPress={() => setShowDatePicker(false)} style={styles.smallButton}>
                    <Text style={styles.smallButtonText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Recurring expense</Text>
            <Text style={styles.switchHint}>
              Repeats monthly — rent, subscriptions, insurance.
            </Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.switchTrackOn }}
            thumbColor={isRecurring ? colors.primary : colors.white}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>This went into an investment</Text>
            <Text style={styles.switchHint}>
              Save it as spending and create an investment record too.
            </Text>
          </View>
          <Switch
            value={isInvestmentTransfer}
            onValueChange={setIsInvestmentTransfer}
            trackColor={{ false: colors.border, true: colors.switchTrackOn }}
            thumbColor={isInvestmentTransfer ? colors.primary : colors.white}
          />
        </View>

        {isInvestmentTransfer ? (
          <View style={styles.investNotice}>
            <Text style={styles.investNoticeText}>
              This amount will be tracked under Invest. You'll be taken to the investment form to add more details.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Suggested category</Text>
              <View style={styles.suggestionBox}>
                <Text style={styles.suggestionText}>
                  {suggestedBucket === 'must' ? 'Must' : 'Want'}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Use as</Text>
              <View style={styles.segmentRow}>
                <Pressable
                  onPress={() => setBucket('must')}
                  style={[
                    styles.segmentButton,
                    bucket === 'must' && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      bucket === 'must' && styles.segmentTextActive,
                    ]}
                  >
                    Must
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setBucket('want')}
                  style={[
                    styles.segmentButton,
                    bucket === 'want' && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      bucket === 'want' && styles.segmentTextActive,
                    ]}
                  >
                    Want
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
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
          style={({ pressed }) => [
            styles.button,
            (!canSave || pressed) && styles.buttonPressed,
            !canSave && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
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
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  field: {
    marginTop: 16,
  },
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
  inputButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlinePickerFooter: {
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  smallButton: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  switchRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  investNotice: {
    marginTop: 12,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    padding: 14,
  },
  investNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    fontWeight: '500',
  },
  suggestionBox: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
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
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  button: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});