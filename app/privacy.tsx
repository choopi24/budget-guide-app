import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { BackButton } from '../components/ui/BackButton';
import { SectionLabel } from '../components/ui/SectionLabel';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

// ─── Section data ─────────────────────────────────────────────────────────────

type PrivacySection = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  note?: string;
  bullets?: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; body: string }[];
};

const SECTIONS: PrivacySection[] = [
  {
    id: 'local',
    icon: 'phone-portrait-outline',
    iconColor: colors.primary,
    iconBg: '#E6F9F3',
    title: 'What stays on your device',
    body: 'Budget plans, monthly income figures, expenses, and investment holdings are stored in a local database on this device only. The app does not upload or sync this data anywhere.',
  },
  {
    id: 'uninstall',
    icon: 'alert-circle-outline',
    iconColor: colors.want,
    iconBg: '#FAF1E4',
    title: 'Before you uninstall',
    body: 'Deleting the app removes its local database. Create a full backup from Settings → Backup & Restore before uninstalling if you want to keep your financial history.',
  },
  {
    id: 'network',
    icon: 'globe-outline',
    iconColor: colors.keep,
    iconBg: '#E9EFF8',
    title: 'When the app goes online',
    body: 'The core budget tracker works offline. Two optional features may make network requests:',
    bullets: [
      {
        icon: 'trending-up-outline',
        label: 'Crypto price lookups',
        body: 'If you hold a crypto asset in your portfolio, the app may fetch its current price from a public pricing API (CoinGecko). Only the asset ticker symbol is sent — no personal data travels with that request.',
      },
      {
        icon: 'scan-outline',
        label: 'Receipt scanning & AI review',
        body: 'The receipt scanner and AI budget review features send image data or budget summaries to a configured backend endpoint. These features are opt-in; the app will only contact that endpoint when you explicitly trigger them.',
      },
    ],
  },
  {
    id: 'account',
    icon: 'person-circle-outline',
    iconColor: colors.textMuted,
    iconBg: colors.surfaceSoft,
    title: 'No account required',
    body: 'BudgetBull does not require a sign-in, email address, or profile to function. All core tracking features work fully offline without any authentication.',
  },
  {
    id: 'backup',
    icon: 'archive-outline',
    iconColor: colors.primary,
    iconBg: '#E6F9F3',
    title: 'Back up your data',
    body: 'BudgetBull offers two ways to save your data. Create a full backup before deleting or resetting the app.',
    bullets: [
      {
        icon: 'document-text-outline',
        label: 'CSV export',
        body: 'Good for spreadsheets and analysis. Available in Settings → Export CSV Files. Cannot be restored back to the app.',
      },
      {
        icon: 'archive-outline',
        label: 'Full backup (.json)',
        body: 'Captures everything — months, expenses, investments, and settings. Available in Settings → Backup & Restore. Can be fully restored.',
      },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <AppScreen scroll>

      {/* ── Navigation ── */}
      <BackButton onPress={() => router.back()} />

      {/* ── Page header ── */}
      <View style={styles.pageHeader}>
        <SectionLabel style={styles.eyebrow}>About this app</SectionLabel>
        <Text style={styles.pageTitle}>Privacy & Data</Text>
        <Text style={styles.pageSub}>
          Clear answers about what data this app collects, where it goes, and how to protect it.
        </Text>
      </View>

      {/* ── Local-first callout ── */}
      <View style={styles.callout}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        <Text style={styles.calloutText}>
          This app is local-first. Your financial data never leaves your device unless you choose to export it.
        </Text>
      </View>

      {/* ── Sections ── */}
      {SECTIONS.map((section) => (
        <View key={section.id} style={styles.card}>

          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: section.iconBg }]}>
              <Ionicons name={section.icon} size={18} color={section.iconColor} />
            </View>
            <Text style={styles.cardTitle}>{section.title}</Text>
          </View>

          {/* Body */}
          <Text style={styles.cardBody}>{section.body}</Text>

          {/* Optional bullets */}
          {section.bullets && (
            <View style={styles.bulletList}>
              {section.bullets.map((b) => (
                <View key={b.label} style={styles.bullet}>
                  <View style={styles.bulletIcon}>
                    <Ionicons name={b.icon} size={14} color={colors.textMuted} />
                  </View>
                  <View style={styles.bulletText}>
                    <Text style={styles.bulletLabel}>{b.label}</Text>
                    <Text style={styles.bulletBody}>{b.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Optional note */}
          {section.note && (
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
              <Text style={styles.noteText}>{section.note}</Text>
            </View>
          )}

        </View>
      ))}

      {/* ── Footer ── */}
      <Text style={styles.footer}>
        This information reflects how the app works today. It will be updated if new features change any of the above.
      </Text>

    </AppScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: {
    marginTop: spacing[3],
    marginBottom: spacing[4],
    paddingHorizontal: 4,
  },
  eyebrow: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  pageSub: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },

  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#E6F9F3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  calloutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
    fontWeight: '500',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },

  bulletList: {
    marginTop: 14,
    gap: 12,
  },
  bullet: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bulletIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  bulletText: { flex: 1 },
  bulletLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bulletBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },

  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[8],
  },
});
