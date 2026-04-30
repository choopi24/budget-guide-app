import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { GRADE_COLOR, type BudgetGrade, type GradeExplanation } from '../../lib/grade';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/tokens';

type Props = {
  grade: BudgetGrade;
  gradeExp: GradeExplanation;
};

export function GradePanel({ grade, gradeExp }: Props) {
  return (
    <View style={[styles.gradePanel, { borderColor: GRADE_COLOR[grade] + '40' }]}>
      <View style={styles.gradePanelHeader}>
        <View style={[styles.gradePanelDot, { backgroundColor: GRADE_COLOR[grade] }]} />
        <Text style={[styles.gradePanelTitle, { color: GRADE_COLOR[grade] }]}>
          Grade {grade}
        </Text>
      </View>
      {gradeExp.reasons.map((r, i) => (
        <View key={i} style={styles.gradePanelRow}>
          <Ionicons name="remove" size={12} color={colors.textTertiary} style={styles.gradePanelBullet} />
          <Text style={styles.gradePanelReason}>{r}</Text>
        </View>
      ))}
      {gradeExp.improve && (
        <View style={[styles.gradePanelImprove, { borderTopColor: GRADE_COLOR[grade] + '25' }]}>
          <Ionicons name="arrow-up-circle-outline" size={14} color={GRADE_COLOR[grade]} />
          <Text style={[styles.gradePanelImproveText, { color: GRADE_COLOR[grade] }]}>
            {gradeExp.improve}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gradePanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[5],
    gap: spacing[2],
    ...shadows.sm,
  },
  gradePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  gradePanelDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  gradePanelTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  gradePanelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  gradePanelBullet: {
    marginTop: 3,
    flexShrink: 0,
  },
  gradePanelReason: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  gradePanelImprove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gradePanelImproveText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
