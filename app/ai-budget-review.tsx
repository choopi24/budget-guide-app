import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/ui/Card';
import { useAiAnalysisDb } from '../db/aiAnalysis';
import { useHomeDb } from '../db/home';
import { useProfileDb } from '../db/profile';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { analyzeBudget, buildAnalysisInput, type BudgetAnalysisResponse } from '../lib/ai';
import { formatCentsToMoney } from '../lib/money';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius, shadows, spacing } from '../theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScreenState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: BudgetAnalysisResponse; currency: SupportedCurrency };

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENTIMENT_ICON: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'checkmark-circle-outline',
  neutral:  'remove-circle-outline',
  negative: 'alert-circle-outline',
};

const SENTIMENT_COLOR: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: colors.must,
  neutral:  colors.textMuted,
  negative: colors.danger,
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AiBudgetReviewScreen() {
  const router = useRouter();
  const { getActiveMonthHomeData } = useHomeDb();
  const { getProfile } = useProfileDb();
  const { getCurrency } = useSettingsDb();
  const { getPriorMonths, getRecentExpenses, getActiveMonthId } = useAiAnalysisDb();

  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  useEffect(() => {
    runAnalysis();
  }, []);

  async function runAnalysis() {
    setState({ status: 'loading' });
    try {
      const [monthData, profile, priorMonths, activeMonthRow, currency] = await Promise.all([
        getActiveMonthHomeData(),
        getProfile(),
        getPriorMonths(),
        getActiveMonthId(),
        getCurrency(),
      ]);

      if (!monthData || !activeMonthRow) {
        setState({ status: 'empty' });
        return;
      }

      const recentExpenses = await getRecentExpenses(activeMonthRow.id);

      const input = buildAnalysisInput({
        homeData:       monthData,
        priorMonths,
        recentExpenses,
        userName:       profile.name ?? undefined,
        currency,
      });

      const result = await analyzeBudget(input);

      setState({ status: 'success', result, currency });
    } catch (e: any) {
      setState({
        status: 'error',
        message: e?.message ?? 'Something went wrong. Please try again.',
      });
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <AppScreen>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => pressed && { opacity: 0.55 }}
          >
            <Text style={styles.backText}>Cancel</Text>
          </Pressable>
        </View>
        <View style={styles.centeredWrap}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing[5] }} />
            <Text style={styles.loadingTitle}>Analyzing your month…</Text>
            <Text style={styles.loadingBody}>
              Reviewing spending patterns and building your insight.
            </Text>
          </View>
        </View>
      </AppScreen>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (state.status === 'empty') {
    return (
      <AppScreen>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.centeredWrap}>
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="analytics-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Not enough data yet</Text>
            <Text style={styles.emptyBody}>
              Set up an active month and add a few expenses to unlock your AI budget review.
            </Text>
          </Card>
        </View>
      </AppScreen>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <AppScreen>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.centeredWrap}>
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={[styles.iconWrap, styles.iconWrapDanger]}>
              <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
            </View>
            <Text style={styles.emptyTitle}>Couldn't load review</Text>
            <Text style={styles.emptyBody}>{state.message}</Text>
            <Pressable
              onPress={runAnalysis}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </Card>
        </View>
      </AppScreen>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  const { result, currency } = state;

  return (
    <AppScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => pressed && { opacity: 0.55 }}
          >
            <Text style={styles.backText}>Done</Text>
          </Pressable>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={11} color={colors.primary} />
            <Text style={styles.badgeText}>AI Review</Text>
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={styles.summarySection}>
          <Text style={styles.screenTitle}>Budget Review</Text>
          <Text style={styles.summaryText}>{result.summary}</Text>
        </View>

        {/* ── Score impact note ── */}
        {result.scoreImpactNote && (
          <View style={styles.impactNote}>
            <Ionicons name="trending-up-outline" size={15} color={colors.keep} />
            <Text style={styles.impactNoteText}>{result.scoreImpactNote}</Text>
          </View>
        )}

        {/* ── Behavior patterns ── */}
        {result.behaviorPatterns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Patterns</Text>
            <Card variant="outlined" padding={false} style={styles.listCard}>
              {result.behaviorPatterns.map((p, i) => (
                <View key={i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.listRow}>
                    <Ionicons
                      name={SENTIMENT_ICON[p.sentiment] as any}
                      size={18}
                      color={SENTIMENT_COLOR[p.sentiment]}
                      style={styles.listIcon}
                    />
                    <View style={styles.listText}>
                      <Text style={styles.listTitle}>{p.label}</Text>
                      <Text style={styles.listDetail}>{p.detail}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ── Risks (if any) ── */}
        {result.risks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Watch Out For</Text>
            <Card variant="outlined" padding={false} style={styles.listCard}>
              {result.risks.map((r, i) => (
                <View key={i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.listRow}>
                    <View style={[styles.riskDot, styles[`riskDot_${r.severity}`]]} />
                    <Text style={styles.listDetail}>{r.description}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ── Suggestions ── */}
        {result.suggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Next Steps</Text>
            {result.suggestions.map((s, i) => (
              <View key={i} style={[styles.suggestionCard, i > 0 && { marginTop: spacing[3] }]}>
                <View style={styles.suggestionHeader}>
                  <View style={styles.suggestionNumWrap}>
                    <Text style={styles.suggestionNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.suggestionTitle}>{s.title}</Text>
                </View>
                <Text style={styles.suggestionDetail}>{s.detail}</Text>
                {s.savingEstimateCents != null && s.savingEstimateCents > 0 && (
                  <View style={styles.savingChip}>
                    <Ionicons name="leaf-outline" size={11} color={colors.must} />
                    <Text style={styles.savingChipText}>
                      Could save ~{formatCentsToMoney(s.savingEstimateCents, currency)}/mo
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Encouragement footer ── */}
        <View style={styles.encouragementWrap}>
          <Ionicons name="star-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.encouragementText}>{result.encouragement}</Text>
        </View>

      </ScrollView>
    </AppScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing[10],
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Summary ───────────────────────────────────────────────────────────────
  summarySection: {
    marginBottom: spacing[5],
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    color: colors.textInverse,
    letterSpacing: -0.3,
    marginBottom: spacing[4],
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.text,
    fontWeight: '400',
  },

  // ── Score impact ──────────────────────────────────────────────────────────
  impactNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.keepSoft,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.keep + '30',
  },
  impactNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.keep,
    fontWeight: '500',
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },

  // ── Shared list card ──────────────────────────────────────────────────────
  listCard: {
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  listIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  listText: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  listDetail: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing[4],
  },

  // ── Risk dots ─────────────────────────────────────────────────────────────
  riskDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
    flexShrink: 0,
  },
  riskDot_low:    { backgroundColor: colors.want },
  riskDot_medium: { backgroundColor: colors.want },
  riskDot_high:   { backgroundColor: colors.danger },

  // ── Suggestion cards ──────────────────────────────────────────────────────
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    ...shadows.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  suggestionNumWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  suggestionNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  suggestionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
  },
  suggestionDetail: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    paddingLeft: 22 + spacing[3],
  },
  savingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    marginLeft: 22 + spacing[3],
    alignSelf: 'flex-start',
    backgroundColor: colors.mustSoft,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing[2],
  },
  savingChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.must,
  },

  // ── Encouragement ─────────────────────────────────────────────────────────
  encouragementWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    marginTop: spacing[4],
  },
  encouragementText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // ── Centered states (loading / empty / error) ─────────────────────────────
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 260,
    ...shadows.md,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  loadingBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  iconWrapDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger + '25',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing[5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
