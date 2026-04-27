import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { BackButton } from '../components/ui/BackButton';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

// ── Calculator card definitions ───────────────────────────────────────────────

type CalcCard = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
};

const CALCULATORS: CalcCard[] = [
  {
    id: 'compound',
    icon: 'trending-up-outline',
    iconColor: colors.primary,
    iconBg: colors.surfaceSoft,
    title: 'Compound Interest',
    description: 'See how your investments grow over time.',
  },
  {
    id: 'salary',
    icon: 'briefcase-outline',
    iconColor: colors.keep,
    iconBg: colors.keepSoft,
    title: 'Net Salary',
    description: 'Estimate take-home pay after tax.',
  },
  {
    id: 'loan',
    icon: 'home-outline',
    iconColor: colors.must,
    iconBg: colors.mustSoft,
    title: 'Loan Payment',
    description: 'Plan monthly mortgage or loan repayments.',
  },
  {
    id: 'savings',
    icon: 'flag-outline',
    iconColor: colors.primary,
    iconBg: colors.surfaceSoft,
    title: 'Savings Goal',
    description: 'Find out how long to reach your target.',
  },
  {
    id: 'budget',
    icon: 'pie-chart-outline',
    iconColor: colors.keep,
    iconBg: colors.keepSoft,
    title: 'Budget Split',
    description: 'Split income into Must, Want, and Invest.',
  },
  {
    id: 'emergency',
    icon: 'shield-checkmark-outline',
    iconColor: colors.want,
    iconBg: colors.wantSoft,
    title: 'Emergency Fund',
    description: 'Calculate your safety net target.',
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CalculatorsScreen() {
  const router = useRouter();

  return (
    <AppScreen scroll>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <BackButton
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')
          }
        />
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Finance tools</Text>
        <Text style={styles.title}>Calculators</Text>
        <Text style={styles.subtitle}>
          Helpful tools to plan, optimize, and understand your finances.
        </Text>
      </View>

      {/* ── Calculator grid ── */}
      <View style={styles.grid}>
        {CALCULATORS.map((calc) => (
          <View key={calc.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: calc.iconBg }]}>
              <Ionicons name={calc.icon} size={20} color={calc.iconColor} />
            </View>
            <Text style={styles.cardTitle}>{calc.title}</Text>
            <Text style={styles.cardDesc}>{calc.description}</Text>
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing[4],
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    marginBottom: spacing[6],
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing[1] + 2,
    letterSpacing: -0.1,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginBottom: spacing[3],
    flexGrow: 1,
  },
  comingSoonPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.panel,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 4,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
});
