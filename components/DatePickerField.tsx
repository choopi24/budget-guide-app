import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatFriendlyDate } from '../lib/date';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  /** Defaults to today */
  maximumDate?: Date;
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * A date input with three quick chips (Today / Yesterday / custom date) and
 * an inline iOS spinner that only appears when the user actually needs it.
 *
 * Usage:
 *   <DatePickerField value={date} onChange={setDate} />
 */
export function DatePickerField({ value, onChange, maximumDate }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  const isToday = isSameLocalDay(value, todayMidnight);
  const isYesterday = isSameLocalDay(value, yesterdayMidnight);
  const isCustom = !isToday && !isYesterday;

  // Third chip shows the selected date when custom, otherwise a prompt
  const customChipLabel = isCustom ? formatFriendlyDate(value) : 'Pick date';

  function handleToday() {
    onChange(todayMidnight);
    setPickerOpen(false);
  }

  function handleYesterday() {
    onChange(yesterdayMidnight);
    setPickerOpen(false);
  }

  function handleTogglePicker() {
    setPickerOpen((prev) => !prev);
  }

  return (
    <View>
      <View style={styles.chipRow}>
        {/* ── Chip 1: Today ─────────────────────── */}
        <Pressable
          onPress={handleToday}
          accessibilityRole="button"
          accessibilityLabel="Today"
          accessibilityState={{ selected: isToday }}
          style={({ pressed }) => [
            styles.chip,
            isToday && styles.chipActive,
            pressed && !isToday && styles.chipPressed,
          ]}
        >
          <Text style={[styles.chipText, isToday && styles.chipTextActive]}>
            Today
          </Text>
        </Pressable>

        {/* ── Chip 2: Yesterday ─────────────────── */}
        <Pressable
          onPress={handleYesterday}
          accessibilityRole="button"
          accessibilityLabel="Yesterday"
          accessibilityState={{ selected: isYesterday }}
          style={({ pressed }) => [
            styles.chip,
            isYesterday && styles.chipActive,
            pressed && !isYesterday && styles.chipPressed,
          ]}
        >
          <Text style={[styles.chipText, isYesterday && styles.chipTextActive]}>
            Yesterday
          </Text>
        </Pressable>

        {/* ── Chip 3: Custom / Pick date ────────── */}
        <Pressable
          onPress={handleTogglePicker}
          accessibilityRole="button"
          accessibilityLabel={isCustom ? `Selected date: ${customChipLabel}` : 'Pick a date'}
          accessibilityHint="Opens date picker"
          accessibilityState={{ selected: isCustom }}
          style={({ pressed }) => [
            styles.chip,
            styles.chipCustom,
            isCustom && styles.chipActive,
            !isCustom && pickerOpen && styles.chipPickerOpen,
            pressed && styles.chipPressed,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              (isCustom || pickerOpen) && styles.chipTextActive,
            ]}
          >
            {customChipLabel}
          </Text>
          <Text style={[styles.chevron, pickerOpen && styles.chevronOpen]}>
            {pickerOpen ? '▲' : '▾'}
          </Text>
        </Pressable>
      </View>

      {/* ── Inline iOS spinner ───────────────────── */}
      {pickerOpen && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            textColor={colors.text}
            maximumDate={maximumDate ?? new Date()}
            onChange={(_, selectedDate) => {
              if (Platform.OS !== 'ios') setPickerOpen(false);
              if (selectedDate) onChange(selectedDate);
            }}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.pickerFooter}>
              <Pressable
                onPress={() => setPickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Done"
                style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],      // 8
  },
  chip: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,  // 16
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],  // 4
  },
  chipCustom: {
    flexDirection: 'row',
    gap: spacing[1],  // 4
  },
  chipActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  chipPickerOpen: {
    borderColor: colors.primary + '60',
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.text,
  },
  chevron: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 16,
  },
  chevronOpen: {
    color: colors.primary,
  },
  pickerWrap: {
    marginTop: spacing[2],  // 8
    backgroundColor: colors.white,
    borderRadius: radius.lg,  // 16
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerFooter: {
    alignItems: 'flex-end',
    padding: spacing[2],  // 8
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  doneBtn: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing[4],  // 16
    paddingVertical: spacing[2] + 2,  // 10
    borderRadius: radius.md,  // 12
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
