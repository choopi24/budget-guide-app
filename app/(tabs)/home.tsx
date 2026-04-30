import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { HomeFab } from '../../components/ui/HomeFab';
import { BudgetMetersCard } from '../../components/home/BudgetMetersCard';
import { GradePanel } from '../../components/home/GradePanel';
import { HeroCard } from '../../components/home/HeroCard';
import { HomeEmptyState } from '../../components/home/HomeEmptyState';
import { HomeTopBar } from '../../components/home/HomeTopBar';
import { RecurringSuggestionsCard } from '../../components/home/RecurringSuggestionsCard';
import { useHomeData } from '../../hooks/useHomeData';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/tokens';

export default function HomeScreen() {
  'use no memo';

  const router = useRouter();
  const {
    month,
    currency,
    grade,
    gradeExp,
    showGradeExp,
    setShowGradeExp,
    pendingRecurring,
    derived,
    confirmApply,
  } = useHomeData();

  if (!month) {
    return <HomeEmptyState onSetUp={() => router.push('/month-setup' as any)} />;
  }

  const { paceRatio, rows, isOverBudget, currencySymbol, heroAmountText, daysLeft, pctUsed, paceLabel } = derived!;

  return (
    <View style={styles.root}>
      <AppScreen scroll>

        <HomeTopBar
          monthKey={month.month_key}
          grade={grade}
          showGradeExp={showGradeExp}
          onToggleGradeExp={() => setShowGradeExp((v) => !v)}
        />

        <HeroCard
          currencySymbol={currencySymbol}
          heroAmountText={heroAmountText}
          isOverBudget={isOverBudget}
          daysLeft={daysLeft}
          pctUsed={pctUsed}
          paceLabel={paceLabel}
        />

        {showGradeExp && grade && gradeExp && (
          <GradePanel grade={grade} gradeExp={gradeExp} />
        )}

        <BudgetMetersCard
          rows={rows}
          paceRatio={paceRatio}
          currency={currency}
          monthKey={month.month_key}
        />

        {pendingRecurring.length > 0 && (
          <RecurringSuggestionsCard
            items={pendingRecurring}
            currency={currency}
            onAdd={confirmApply}
            onManage={() => router.push('/recurring' as any)}
          />
        )}

        {/* ── AI Budget Review entry ── */}
        <Pressable
          onPress={() => router.push('/ai-budget-review' as any)}
          style={({ pressed }) => [styles.aiReviewRow, pressed && styles.aiReviewRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open AI budget review"
        >
          <View style={styles.aiReviewIconWrap}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
          <View style={styles.aiReviewText}>
            <Text style={styles.aiReviewLabel}>AI Budget Review</Text>
            <Text style={styles.aiReviewHint}>Patterns, risks, and suggestions</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.border} />
        </Pressable>

        {/* ── All expenses link ── */}
        <Pressable
          onPress={() => router.push('/expenses' as any)}
          accessibilityRole="button"
          accessibilityLabel="View all expenses"
          style={({ pressed }) => [styles.allExpenses, pressed && styles.allExpensesPressed]}
        >
          <Text style={styles.allExpensesText}>View all expenses</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
        </Pressable>

      </AppScreen>

      <HomeFab
        onAdd={() => router.push('/expense-new' as any)}
        onScan={() => router.push('/receipt-scan' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── AI Budget Review entry ─────────────────────────────────────────────────
  aiReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  aiReviewRowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  aiReviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiReviewText: {
    flex: 1,
  },
  aiReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  aiReviewHint: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // ── All expenses link ──────────────────────────────────────────────────────
  allExpenses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[6],
  },
  allExpensesPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.98 }],
  },
  allExpensesText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
