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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useExpensesDb } from '../db/expenses';
import { formatFriendlyDate, getMonthLabelFromKey } from '../lib/date';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

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

      <Card variant="outlined">
        {/* ── Context banner ── */}
        <View style={styles.contextBanner}>
          <Ionicons name="time-outline" size={15} color={colors.keep} />
          <Text style={styles.contextText}>
            Adding to a past month
          </Text>
        </View>

        <SectionLabel style={styles.eyebrow}>Missed expense</SectionLabel>
        <Text style={styles.title}>{monthLabel}</Text>
        <Text style={styles.body}>
          {"Log an expense you forgot to record. This updates that month's record and adjusts carryover into the next month if needed."}
        </Text>

        {/* ── Title ── */}
        <Input
          label="What was it for?"
          value={title}
          onChangeText={setTitle}
          placeholder="Groceries, taxi, pharmacy..."
          autoFocus
          containerStyle={styles.field}
        />

        {/* ── Amount ── */}
        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="120"
          keyboardType="decimal-pad"
          containerStyle={styles.field}
        />

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
        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
          style={styles.noteInput}
          containerStyle={styles.field}
        />

        {/* ── Save ── */}
        <Button
          label={saving ? 'Saving…' : `Add to ${monthLabel}`}
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[3],
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  eyebrow: {
    marginBottom: spacing[2],
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 2,
    backgroundColor: colors.keepSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[5],
    alignSelf: 'flex-start',
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.keep,
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
    marginBottom: spacing[1],
  },
  field: {
    marginTop: spacing[5],
  },
  noteInput: {
    minHeight: 80,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing[2] + 2,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerWrap: {
    marginTop: spacing[2],
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerFooter: {
    alignItems: 'flex-end',
    padding: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  doneBtn: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2,
    borderRadius: radius.md,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  // placeholder — styles.button no longer used (replaced with Button primitive)
  button: {
    marginTop: spacing[6],
    height: 52,
    borderRadius: radius.full,
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
