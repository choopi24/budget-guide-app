import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { AppLogo } from '../../components/AppLogo';
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
  LEAGUE_META,
  getLeague,
  getNextLeagueThreshold,
  useProfileDb,
  type League,
  type MonthScoreRow,
  type ProfileData,
} from '../../db/profile';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { GRADE_COLOR, type BudgetGrade } from '../../lib/grade';
import { getMonthLabelFromKey } from '../../lib/date';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';

function GradeBadge({ grade }: { grade: BudgetGrade }) {
  return (
    <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLOR[grade] + '20' }]}>
      <Text style={[styles.gradeText, { color: GRADE_COLOR[grade] }]}>{grade}</Text>
    </View>
  );
}

function streakFlames(count: number): string {
  if (count >= 30) return '🔥🔥🔥🔥🔥';
  if (count >= 14) return '🔥🔥🔥🔥';
  if (count >= 7)  return '🔥🔥🔥';
  if (count >= 3)  return '🔥🔥';
  if (count >= 1)  return '🔥';
  return '';
}

function joinedAgo(dateStr: string): string {
  const joined = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Joined today';
  if (days === 1) return 'Joined yesterday';
  if (days < 30)  return `Joined ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Joined ${months} month${months > 1 ? 's' : ''} ago`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { getProfile, getMonthScores } = useProfileDb();
  const { getCurrency } = useSettingsDb();
  const { getAvatarConfig } = useAvatarDb();
  const { getStreak, touchStreak, getAchievements, checkAndUnlockAchievements } = useAchievementsDb();

  const [profile, setProfile] = useState<ProfileData>({ name: null, occupation: null, email: null });
  const [months, setMonths] = useState<MonthScoreRow[]>([]);
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [avatar, setAvatar] = useState<AvatarConfig>({ skinTone: 's2', hairStyle: 'clean', hairColor: 'dkbrown', suitColor: 'navy', hat: 'none', glasses: 'none', extra: 'none' });
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const load = useCallback(async () => {
    const [p, m, c, cfg, s, ach] = await Promise.all([
      getProfile(),
      getMonthScores(),
      getCurrency(),
      getAvatarConfig(),
      touchStreak(),
      getAchievements(),
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

  const league: League | null = avgScore !== null ? getLeague(avgScore) : null;
  const leagueMeta = league ? LEAGUE_META[league] : null;
  const nextThreshold = league ? getNextLeagueThreshold(league) : null;

  const progressToNext = useMemo(() => {
    if (avgScore === null || nextThreshold === null) return 1;
    const bounds: Record<League, number> = { Iron: 0, Bronze: 38, Silver: 58, Gold: 75, Apex: 90 };
    const lower = league ? bounds[league] : 0;
    return Math.min(1, (avgScore - lower) / (nextThreshold - lower));
  }, [avgScore, nextThreshold, league]);

  const totalMonths = months.length;

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

  return (
    <AppScreen scroll>

      {/* ── Profile Hero ──────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.eyebrow}>Your profile</Text>
            <Text style={styles.pageTitle}>{profile.name ?? 'Your name'}</Text>
            {!!profile.occupation && (
              <Text style={styles.occupation}>{profile.occupation}</Text>
            )}
            <Pressable
              onPress={() => router.push('/(tabs)/settings' as any)}
              style={styles.editProfileButton}
            >
              <Text style={styles.editProfileText}>Edit profile</Text>
            </Pressable>
          </View>

          {/* Tappable bull avatar */}
          <Pressable
            onPress={() => router.push('/avatar-edit' as any)}
            style={styles.avatarContainer}
          >
            <HumanAvatar
              skinTone={avatar.skinTone}
              suitColor={avatar.suitColor}
              hat={avatar.hat}
              glasses={avatar.glasses}
              extra={avatar.extra}
              size={96}
              animated
              ownerName={profile.name ?? ''}
            />
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarIcon}>✎</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Streak Card ───────────────────────────────── */}
      {streak !== null && (
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <AppLogo size={64} streakCount={streak.currentStreak} />
          </View>
          <View style={styles.streakRight}>
            <Text style={styles.streakTitle}>
              Day {streak.currentStreak} Streak {streakFlames(streak.currentStreak)}
            </Text>
            <Text style={styles.streakSub}>
              {joinedAgo(streak.joinDate)}
            </Text>
            {streak.longestStreak > 1 && (
              <Text style={styles.streakRecord}>
                Personal best: {streak.longestStreak} days
              </Text>
            )}
            <View style={styles.streakPips}>
              {Array.from({ length: Math.min(streak.currentStreak, 7) }).map((_, i) => (
                <View key={i} style={styles.streakPip} />
              ))}
              {streak.currentStreak > 7 && (
                <Text style={styles.streakMore}>+{streak.currentStreak - 7}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── No data yet ───────────────────────────────── */}
      {months.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyBody}>
            Complete your first budget month to unlock your league and scoreboard.
          </Text>
        </View>
      )}

      {/* ── League Card ───────────────────────────────── */}
      {league && leagueMeta && (
        <View style={[styles.leagueCard, { borderColor: leagueMeta.color + '40' }]}>
          <View style={styles.leagueTopRow}>
            <View>
              <Text style={styles.leagueEyebrow}>Current league</Text>
              <Text style={[styles.leagueName, { color: leagueMeta.color }]}>{league}</Text>
              <Text style={styles.leagueDescription}>{leagueMeta.description}</Text>
            </View>
            <View style={[styles.leagueBadge, { backgroundColor: leagueMeta.accent }]}>
              <Text style={[styles.leagueBadgeIcon, { color: leagueMeta.color }]}>{leagueMeta.icon}</Text>
              <Text style={[styles.leagueBadgeText, { color: leagueMeta.color }]}>{league}</Text>
            </View>
          </View>

          <View style={styles.leagueStats}>
            <View style={styles.leagueStat}>
              <Text style={styles.leagueStatValue}>{avgScore}</Text>
              <Text style={styles.leagueStatLabel}>Avg score</Text>
            </View>
            <View style={styles.leagueStatDivider} />
            <View style={styles.leagueStat}>
              <Text style={styles.leagueStatValue}>{totalMonths}</Text>
              <Text style={styles.leagueStatLabel}>Months tracked</Text>
            </View>
            {bestGrade && (
              <>
                <View style={styles.leagueStatDivider} />
                <View style={styles.leagueStat}>
                  <Text style={[styles.leagueStatValue, { color: GRADE_COLOR[bestGrade] }]}>{bestGrade}</Text>
                  <Text style={styles.leagueStatLabel}>Best grade</Text>
                </View>
              </>
            )}
          </View>

          {nextThreshold !== null && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Progress to next league</Text>
                <Text style={[styles.progressLabel, { color: leagueMeta.color }]}>
                  {avgScore} / {nextThreshold}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(progressToNext * 100)}%` as any, backgroundColor: leagueMeta.color },
                  ]}
                />
              </View>
            </View>
          )}

          {nextThreshold === null && (
            <View style={styles.apexBanner}>
              <Text style={[styles.apexBannerText, { color: leagueMeta.color }]}>
                You've reached the top league
              </Text>
            </View>
          )}
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
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.achieveCount}>
          {unlockedCount} / {ACHIEVEMENT_DEFS.length}
        </Text>
      </View>
      <View style={styles.achieveGrid}>
        {achievements.map((ach) => {
          const unlocked = ach.unlockedAt !== null;
          return (
            <View
              key={ach.id}
              style={[styles.achieveCard, !unlocked && styles.achieveCardLocked]}
            >
              <Text style={[styles.achieveIcon, !unlocked && styles.achieveIconLocked]}>
                {unlocked ? ach.icon : '🔒'}
              </Text>
              <Text style={[styles.achieveTitle, !unlocked && styles.achieveTitleLocked]}>
                {ach.title}
              </Text>
              <Text style={[styles.achieveDesc, !unlocked && styles.achieveDescLocked]}>
                {ach.description}
              </Text>
              {unlocked && (
                <View style={styles.achieveUnlockedDot} />
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  occupation: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  editProfileButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  avatarContainer: {
    position: 'relative',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 6,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  editAvatarIcon: {
    fontSize: 11,
    color: colors.white,
    lineHeight: 14,
  },
  // Streak card
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  streakLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakRight: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  streakSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  streakRecord: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  streakPips: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  streakPip: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  streakMore: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  // League
  leagueCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  leagueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  leagueEyebrow: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', color: colors.textMuted, marginBottom: 6,
  },
  leagueName: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  leagueDescription: {
    marginTop: 4, fontSize: 13, color: colors.textMuted, maxWidth: 200, lineHeight: 18,
  },
  leagueBadge: {
    width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  leagueBadgeIcon: { fontSize: 22 },
  leagueBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  leagueStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 8, marginBottom: 18,
  },
  leagueStat: { flex: 1, alignItems: 'center' },
  leagueStatDivider: {
    width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.border,
  },
  leagueStatValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  leagueStatLabel: {
    marginTop: 3, fontSize: 11, color: colors.textMuted,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  progressSection: { marginTop: 2 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  progressTrack: {
    height: 8, backgroundColor: colors.background, borderRadius: 999, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  apexBanner: {
    marginTop: 8, paddingVertical: 10,
    backgroundColor: colors.background, borderRadius: 12, alignItems: 'center',
  },
  apexBannerText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  // Section titles
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginLeft: 4,
  },
  // Grade dist
  distCard: {
    backgroundColor: colors.surface, borderRadius: 22, padding: 18,
    marginBottom: 20, gap: 12,
    shadowColor: colors.text, shadowOpacity: 0.05,
    shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2,
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
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 12, paddingHorizontal: 4,
  },
  achieveCount: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  achieveGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  achieveCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    position: 'relative',
  },
  achieveCardLocked: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  achieveIcon: { fontSize: 26, marginBottom: 8 },
  achieveIconLocked: { opacity: 0.4 },
  achieveTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  achieveTitleLocked: { color: colors.textMuted },
  achieveDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  achieveDescLocked: { color: colors.textMuted, opacity: 0.7 },
  achieveUnlockedDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 999, backgroundColor: colors.primary,
  },
  // Scoreboard
  scoreboardCard: {
    backgroundColor: colors.surface, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 6,
    shadowColor: colors.text, shadowOpacity: 0.05,
    shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    marginBottom: 30,
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
});
