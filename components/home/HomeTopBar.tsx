import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMonthLabelFromKey } from '../../lib/date';
import { GRADE_COLOR, type BudgetGrade } from '../../lib/grade';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';

type Props = {
  monthKey: string;
  grade: BudgetGrade | null;
  showGradeExp: boolean;
  onToggleGradeExp: () => void;
};

export function HomeTopBar({ monthKey, grade, showGradeExp, onToggleGradeExp }: Props) {
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={styles.topEyebrow}>Budget</Text>
        <Text style={styles.topMonth}>{getMonthLabelFromKey(monthKey)}</Text>
      </View>

      {grade && (
        <Pressable
          onPress={onToggleGradeExp}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Budget grade ${grade} — tap to ${showGradeExp ? 'hide' : 'show'} details`}
          style={({ pressed }) => [
            styles.gradeBadge,
            { backgroundColor: GRADE_COLOR[grade] + '18' },
            pressed && styles.gradeBadgePressed,
          ]}
        >
          <Text style={[styles.gradeBadgeText, { color: GRADE_COLOR[grade] }]}>
            {grade}
          </Text>
          <Ionicons
            name={showGradeExp ? 'chevron-up' : 'chevron-down'}
            size={11}
            color={GRADE_COLOR[grade]}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing[1],
  },
  topEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 3,
  },
  topMonth: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  gradeBadgePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
