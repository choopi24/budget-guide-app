import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useExpensesDb } from '../db/expenses';
import { formatFriendlyDate, getMonthLabelFromKey } from '../lib/date';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

export default function PastMonthExpenseScreen() {
  const router = useRouter();
  const { monthId, monthKey } = useLocalSearchParams<{ monthId: string; monthKey: string }>();
  const { addPastMonthExpense } = useExpensesDb();

  const monthIdNum = Number(monthId);
  const monthLabel = monthKey ? getMonthLabelFromKey(monthKey) : '';

  // Default the date to the last day of the target month
  const defaultDate = useMemo(() => {
    if (!monthKey) return new Date();
    const [y, m] = monthKey.split('-').map(Number);
    // Day 0 of next month = last day of this month
    return new Date(y, m, 0);
  }, [monthKey]);

  // Date range: first → last day of the target month
  const minDate = useMemo(() => {
    if (!monthKey) return undefined;
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }, [monthKey]);

  const maxDate = defaultDate;

  const [title, setTitle]           = useState('');
  const [amount, setAmount]         = useState('');
  const [bucket, setBucket]         = useState<'must' | 'want'>('want');
  const [note, setNote]             = useState('');
  const [date, setDate]             = useState(defaultDate);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);

  const amountCents = useMemo(() => parseMoneyToCents(amount), [amount]);
  const canSave = title.trim().length > 0 && amountCents > 0 && !saving;

  async function handleSave() {
    if (!canSave || !monthIdNum) return;

    setSaving(true);
    try {
      const result = await addPastMonthExpense({
        monthId: monthIdNum,
        title,
        amountCents,
        note,
        finalBucket: bucket,
      });

      if (result.rolloverAdjusted) {
        Alert.alert(
          'Expense added',
          `Added to ${monthLabel}. The following month's carryover has been adjusted to reflect the updated surplus.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save expense.');
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
        {/* ── Context banner ── */}
        <View style={styles.contextBanner}>
          <Ionicons name="time-outline" size={15} color={colors.keep} />
          <Text style={styles.contextText}>
            Adding to a past month
          </Text>
        </View>

        <Text style={styles.eyebrow}>Missed expense</Text>
        <Text style={styles.title}>{monthLabel}</Text>
        <Text style={styles.body}>
          Log an expense you forgot to record. This updates that month's record and adjusts carryover into the next month if needed.
        </Text>

        {/* ── Title ── */}
        <View style={styles.field}>
          <Text style={styles.label}>What was it for?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Groceries, taxi, pharmacy..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />
        </View>

        {/* ── Amount ── */}
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

        {/* ── Bucket ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setBucket('must')}
              style={[styles.segmentButton, bucket === 'must' && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, bucket === 'must' && styles.segmentTextActive]}>
                Must
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBucket('want')}
              style={[styles.segmentButton, bucket === 'want' && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, bucket === 'want' && styles.segmentTextActive]}>
                Want
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Date within that month ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>{formatFriendlyDate(date)}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>

          {showPicker && (
            <View style={Platform.OS === 'ios' ? styles.pickerWrap : undefined}>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={colors.text}
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={(_, selected) => {
                  if (Platform.OS !== 'ios') setShowPicker(false);
                  if (selected) setDate(selected);
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.pickerFooter}>
                  <Pressable
                    onPress={() => setShowPicker(false)}
                    style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Note ── */}
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

        {/* ── Save ── */}
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
            {saving ? 'Saving...' : 'Add to ' + monthLabel}
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF1FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.keep,
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  field: {
    marginTop: 18,
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
    minHeight: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerWrap: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerFooter: {
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  doneBtn: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
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
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { backgroundColor: colors.buttonDisabled },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
