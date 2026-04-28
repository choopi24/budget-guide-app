import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import HumanAvatar from '../../components/HumanAvatar';
import {
  ACHIEVEMENT_DEFS,
  useAchievementsDb,
  type Achievement,
  type StreakData,
} from '../../db/achievements';
import { useAvatarDb, type AvatarConfig } from '../../db/avatar';
import {
  GRADE_SCORE,
  getLeague,
  getNextLeagueRequirements,
  useProfileDb,
  type League,
  type MonthScoreRow,
  type ProfileData,
} from '../../db/profile';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { GRADE_COLOR, type BudgetGrade } from '../../lib/grade';
import { getMonthLabelFromKey } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { Card } from '../../components/ui/Card';
import { Eyebrow, Headline } from '../../components/ui/Typography';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';

function GradeBadge({ grade }: { grade: BudgetGrade }) {
  return (
    <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLOR[grade] + '20' }]}>
      <Text style={[styles.gradeText, { color: GRADE_COLOR[grade] }]}>{grade}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { getProfile, getMonthScores } = useProfileDb();
  const { getCurrency } = useSettingsDb();
  const { getAvatarConfig } = useAvatarDb();
  const { touchStreak, getAchievements, checkAndUnlockAchievements } = useAchievementsDb();

  const [profile, setProfile] = useState<ProfileData>({ name: null, occupation: null, email: null });
  const [months, setMonths] = useState<MonthScoreRow[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [avatar, setAvatar] = useState<AvatarConfig>({ skinTone: 's2', hairStyle: 'clean', hairColor: 'dkbrown', suitColor: 'navy', hat: 'none', glasses: 'none', extra: 'none', eyeShape: 'default' });
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const load = useCallback(async () => {
    const [p, m, c, cfg, s] = await Promise.all([
      getProfile(),
      getMonthScores(),
      getCurrency(),
      getAvatarConfig(),
      touchStreak(),
    ]);

    setProfile(p);
    setMonths(m);
    setCurrency(c);
    setAvatar(cfg);
    setStreak(s);

    await checkAndUnlockAchievements(s.currentStreak);
    const updatedAch = await getAchievements();
    setAchievements(updatedAch);
  }, [getProfile, getMonthScores, getCurrency, getAvatarConfig, touchStreak, getAchievements, checkAndUnlockAchievements]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const avgScore = useMemo(() => {
    if (months.length === 0) return null;
    const total = months.reduce((sum, m) => sum + GRADE_SCORE[m.grade], 0);
    return Math.round(total / months.length);
  }, [months]);

  const totalMonths = months.length;

  const league: League | null = avgScore !== null ? getLeague(avgScore, totalMonths) : null;
  const nextReq = league ? getNextLeagueRequirements(league) : null;

  const progressToNext = useMemo(() => {
    if (avgScore === null || nextReq === null) return 1;
    const bounds: Record<League, number> = { Iron: 0, Bronze: 42, Silver: 62, Gold: 77, Apex: 90 };
    const lower = league ? bounds[league] : 0;
    return Math.min(1, (avgScore - lower) / (nextReq.score - lower));
  }, [avgScore, nextReq, league]);

  const gradeDistribution = useMemo(() => {
    const dist: Partial<Record<BudgetGrade, number>> = {};
    for (const m of months) dist[m.grade] = (dist[m.grade] ?? 0) + 1;
    return dist;
  }, [months]);

  const bestGrade = useMemo((): BudgetGrade | null => {
    const order: BudgetGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D', 'F'];
    return order.find((g) => gradeDistribution[g]) ?? null;
  }, [gradeDistribution]);

  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

  // Inline derived values for hero card — no new hooks or state
  const leagueOrder: League[] = ['Iron', 'Bronze', 'Silver', 'Gold', 'Apex'];
  const nextLeagueName: League | null = league && nextReq
    ? (leagueOrder[leagueOrder.indexOf(league) + 1] ?? null)
    : null;
  const pointsToNext = avgScore !== null && nextReq
    ? Math.max(0, nextReq.score - avgScore)
    : 0;

  return (
    <AppScreen scroll>

      {/* ── Profile Hero ──────────────────────────────── */}
      <Card variant="hero" style={styles.heroCard}>

        {/* Row A — identity */}
        <View style={styles.heroIdentityRow}>
          <View style={styles.heroAvatarCircle}>
            <HumanAvatar
              skinTone={avatar.skinTone}
              suitColor={avatar.suitColor}
              hat={avatar.hat}
              glasses={avatar.glasses}
              extra={avatar.extra}
              size={56}
              animated
              ownerName={profile.name ?? ''}
            />
          </View>
          <View style={styles.heroIdentityMid}>
            <Headline color={colors.surface}>{profile.name ?? 'Your name'}</Headline>
            <Text style={styles.heroStreakLine}>
              {streak?.currentStreak ?? 0}-DAY STREAK · {totalMonths} MONTHS
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/settings' as any)}
            hitSlop={10}
            style={styles.heroSettingsBtn}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* Row B — league name */}
        {league && (
          <View style={styles.heroLeagueRow}>
            <Eyebrow color={colors.textTertiary}>CURRENT LEAGUE</Eyebrow>
            <Text style={styles.heroLeagueName}>{league}</Text>
          </View>
        )}

        {/* Row C — progress bar to next league */}
        {league && (
          <View style={styles.heroProgressRow}>
            <View style={styles.heroProgressTrack}>
              <View
                style={[
                  styles.heroProgressFill,
                  { width: `${Math.round(progressToNext * 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.heroProgressLabel}>
              {nextLeagueName
                ? `${pointsToNext} PTS TO ${nextLeagueName.toUpperCase()}`
                : 'APEX — TOP LEAGUE'}
            </Text>
          </View>
        )}

        {/* Row D — KPI tiles */}
        <View style={styles.heroKpiRow}>
          <View style={styles.heroKpiTile}>
            <Text style={styles.heroKpiLabel}>AVG SCORE</Text>
            <Text style={styles.heroKpiValue}>{avgScore ?? '—'}</Text>
          </View>
          <View style={styles.heroKpiTile}>
            <Text style={styles.heroKpiLabel}>MONTHS</Text>
            <Text style={styles.heroKpiValue}>{totalMonths}</Text>
          </View>
          <View style={styles.heroKpiTile}>
            <Text style={styles.heroKpiLabel}>BEST GRADE</Text>
            <Text style={styles.heroKpiValue}>{bestGrade ?? '—'}</Text>
          </View>
        </View>

      </Card>

      {/* ── Utility rows: Settings + Calculators ────── */}
      <Pressable
        onPress={() => router.push('/(tabs)/settings' as any)}
        style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open Settings"
      >
        <View style={styles.settingsIconWrap}>
          <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.settingsText}>
          <Text style={styles.settingsLabel}>Settings</Text>
          <Text style={styles.settingsHint}>Currency, rollovers, Apple Pay</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.border} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/calculators' as any)}
        style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open Calculators"
      >
        <View style={styles.settingsIconWrap}>
          <Ionicons name="calculator-outline" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.settingsText}>
          <Text style={styles.settingsLabel}>Calculators</Text>
          <Text style={styles.settingsHint}>Compound interest, loan, salary, and more</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.border} />
      </Pressable>

      {/* ── No data yet ───────────────────────────────── */}
      {months.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyBody}>
            Complete your first budget month to unlock your league and scoreboard.
          </Text>
        </View>
      )}

      {/* ── Grade Breakdown ───────────────────────────── */}
      {months.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Grade breakdown</Text>
          <View style={styles.distCard}>
            {(['S', 'A+', 'A', 'B', 'C', 'D', 'F'] as BudgetGrade[]).map((g) => {
              const count = gradeDistribution[g] ?? 0;
              if (count === 0) return null;
              const pct = totalMonths > 0 ? count / totalMonths : 0;
              return (
                <View key={g} style={styles.distRow}>
                  <View style={[styles.distDot, { backgroundColor: GRADE_COLOR[g] }]} />
                  <Text style={styles.distGrade}>{g}</Text>
                  <View style={styles.distTrack}>
                    <View
                      style={[
                        styles.distFill,
                        { width: `${Math.round(pct * 100)}%` as any, backgroundColor: GRADE_COLOR[g] },
                      ]}
                    />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Achievements ─────────────────────────────── */}
      <View style={styles.achieveHeader}>
        <Eyebrow>ACHIEVEMENTS</Eyebrow>
        <Text style={styles.achieveCounter}>{unlockedCount} / {ACHIEVEMENT_DEFS.length}</Text>
      </View>
      <View style={styles.achieveGrid}>
        {achievements.map((ach) => {
          const unlocked = ach.unlockedAt !== null;
          return (
            <View
              key={ach.id}
              style={[styles.achieveTile, unlocked ? styles.achieveTileUnlocked : styles.achieveTileLocked]}
            >
              {unlocked ? (
                <>
                  <Text style={styles.achieveTileIcon}>{ach.icon}</Text>
                  <Text style={styles.achieveTileName} numberOfLines={1}>{ach.title}</Text>
                </>
              ) : (
                <Ionicons name="lock-closed" size={18} color={colors.textTertiary} />
              )}
            </View>
          );
        })}
      </View>

      {/* ── Month Scoreboard ─────────────────────────── */}
      {months.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Month scoreboard</Text>
          <View style={styles.scoreboardCard}>
            {months.map((item, index) => {
              const totalSpent = item.must_spent_cents + item.want_spent_cents;
              const totalBudget = item.must_budget_cents + item.want_budget_cents;
              const score = GRADE_SCORE[item.grade];

              return (
                <View
                  key={item.month_key}
                  style={[styles.scoreRow, index !== 0 && styles.scoreRowBorder]}
                >
                  <View style={styles.scoreRowLeft}>
                    <Text style={styles.scoreMonthIndex}>#{totalMonths - index}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scoreMonthLabel}>
                        {getMonthLabelFromKey(item.month_key)}
                      </Text>
                      <Text style={styles.scoreSubtext}>
                        {formatCentsToMoney(totalSpent, currency)} of {formatCentsToMoney(totalBudget, currency)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scoreRowRight}>
                    <GradeBadge grade={item.grade} />
                    <Text style={styles.scorePoints}>{score} pts</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

    </AppScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Hero card ────────────────────────────────────────────────────────────────
  heroCard: {
    marginTop:    spacing[5],
    marginBottom: spacing[6],
  },
  heroIdentityRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[3],
  },
  heroAvatarCircle: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: colors.inkPanel,
    overflow:        'hidden',
    flexShrink:      0,
    alignItems:      'center',
    justifyContent:  'center',
  },
  heroIdentityMid: {
    flex: 1,
  },
  heroStreakLine: {
    fontFamily:    fonts.mono,
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textTertiary,
    marginTop:     3,
  },
  heroSettingsBtn: {
    padding:    spacing[1],
    flexShrink: 0,
  },
  heroLeagueRow: {
    marginTop: spacing[5],
  },
  heroLeagueName: {
    fontFamily:    fonts.bold,
    fontSize:      28,
    color:         colors.gold,
    letterSpacing: -0.5,
    marginTop:     spacing[1],
  },
  heroProgressRow: {
    marginTop: spacing[3],
  },
  heroProgressTrack: {
    height:          4,
    borderRadius:    radius.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow:        'hidden',
  },
  heroProgressFill: {
    height:          4,
    borderRadius:    radius.full,
    backgroundColor: colors.gold,
  },
  heroProgressLabel: {
    fontFamily:    fonts.mono,
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textTertiary,
    marginTop:     spacing[2],
  },
  heroKpiRow: {
    flexDirection: 'row',
    gap:           spacing[3],
    marginTop:     spacing[5],
  },
  heroKpiTile: {
    flex:            1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius:    radius.lg,
    padding:         spacing[3],
  },
  heroKpiLabel: {
    fontFamily:    fonts.mono,
    fontSize:      10,
    letterSpacing: 0.6,
    color:         colors.textTertiary,
    marginBottom:  spacing[1],
  },
  heroKpiValue: {
    fontFamily:    fonts.bold,
    fontSize:      22,
    color:         colors.surface,
    fontVariant:   ['tabular-nums'],
    letterSpacing: -0.5,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    marginBottom: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  // Section titles
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginLeft: 4,
  },
  // Grade dist
  distCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 18,
    marginBottom: 20, gap: 12,
    shadowColor: colors.text, shadowOpacity: 0.05,
    shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distDot: { width: 8, height: 8, borderRadius: 999 },
  distGrade: { width: 28, fontSize: 13, fontWeight: '700', color: colors.text },
  distTrack: {
    flex: 1, height: 8, backgroundColor: colors.background,
    borderRadius: 999, overflow: 'hidden',
  },
  distFill: { height: '100%', borderRadius: 999 },
  distCount: { width: 24, fontSize: 13, fontWeight: '700', color: colors.textMuted, textAlign: 'right' },
  // Achievements
  achieveHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing[3],
  },
  achieveCounter: {
    fontFamily:    fonts.mono,
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textTertiary,
  },
  achieveGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing[3],
    marginBottom:  spacing[6],
  },
  achieveTile: {
    width:          '22%',
    aspectRatio:    1,
    borderRadius:   radius.lg,
    borderWidth:    1,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing[1],
  },
  achieveTileUnlocked: {
    backgroundColor: colors.surface,
  },
  achieveTileLocked: {
    backgroundColor: colors.surfaceSoft,
  },
  achieveTileIcon: {
    fontSize:   22,
    lineHeight: 28,
    textAlign:  'center',
  },
  achieveTileName: {
    fontFamily:  fonts.semiBold,
    fontSize:    11,
    color:       colors.text,
    marginTop:   spacing[1],
    textAlign:   'center',
  },
  // Scoreboard
  scoreboardCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 6,
    shadowColor: colors.text, shadowOpacity: 0.05,
    shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14, gap: 12,
  },
  scoreRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  scoreRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scoreMonthIndex: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 26 },
  scoreMonthLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  scoreSubtext: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  scoreRowRight: { alignItems: 'flex-end', gap: 4 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  gradeText: { fontSize: 13, fontWeight: '800' },
  scorePoints: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  // Settings row
  settingsRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: colors.surface,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingVertical:   14,
    paddingHorizontal: 16,
    marginBottom:    8,
  },
  settingsRowPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  settingsIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  settingsText:  { flex: 1 },
  settingsLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  settingsHint:  { fontSize: 12, color: colors.textMuted },
});
