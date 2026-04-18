import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { colors } from '../../theme/colors';

type Category = 'All' | 'Budgeting' | 'Investing' | 'Saving' | 'Mindset';

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'All',       label: 'All',       icon: '✦' },
  { id: 'Budgeting', label: 'Budgeting', icon: '📊' },
  { id: 'Investing', label: 'Investing', icon: '📈' },
  { id: 'Saving',    label: 'Saving',    icon: '💰' },
  { id: 'Mindset',   label: 'Mindset',   icon: '🧠' },
];

export default function TipsScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  return (
    <AppScreen scroll>

      {/* ── Hero ──────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <SectionLabel style={styles.eyebrow}>Knowledge</SectionLabel>
        <Text style={styles.pageTitle}>Tips & Tricks</Text>
        <Text style={styles.heroSubtext}>
          Smart habits to grow your financial confidence.
        </Text>

        {/* Category filter — embedded in hero, single row */}
        <View style={styles.filterRow}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterIcon, active && styles.filterIconActive]}>
                  {cat.icon}
                </Text>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Empty state ───────────────────────────────── */}
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyIconText}>💡</Text>
        </View>
        <Text style={styles.emptyTitle}>Coming soon</Text>
        <Text style={styles.emptyBody}>
          {activeCategory === 'All'
            ? 'Curated tips across all topics are on their way.'
            : `${activeCategory} tips are being prepared for you.`}
        </Text>

        {/* Placeholder topic cards */}
        <View style={styles.placeholderGrid}>
          {PLACEHOLDER_TOPICS[activeCategory]?.map((topic, i) => (
            <View key={i} style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>{topic.icon}</Text>
              <Text style={styles.placeholderLabel}>{topic.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

// Placeholder topic hints per category (shows what's coming)
const PLACEHOLDER_TOPICS: Record<Category, { icon: string; label: string }[]> = {
  All: [
    { icon: '🎯', label: '50/30/20 rule' },
    { icon: '📉', label: 'Cut hidden fees' },
    { icon: '🔁', label: 'Automate savings' },
    { icon: '📆', label: 'Monthly reviews' },
  ],
  Budgeting: [
    { icon: '🧾', label: 'Track every spend' },
    { icon: '🗂️', label: 'Category limits' },
    { icon: '⚖️', label: 'Needs vs wants' },
    { icon: '🔍', label: 'Find leaks' },
  ],
  Investing: [
    { icon: '📈', label: 'Index funds' },
    { icon: '🕰️', label: 'Compound interest' },
    { icon: '🌍', label: 'Diversify' },
    { icon: '💎', label: 'Long-term thinking' },
  ],
  Saving: [
    { icon: '🏦', label: 'Emergency fund' },
    { icon: '🎯', label: 'Goal-based saving' },
    { icon: '🔄', label: 'Pay yourself first' },
    { icon: '✂️', label: 'Reduce subscriptions' },
  ],
  Mindset: [
    { icon: '🧘', label: 'Delayed gratification' },
    { icon: '📖', label: 'Financial literacy' },
    { icon: '💪', label: 'Build consistency' },
    { icon: '🚀', label: 'Think long-term' },
  ],
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  eyebrow: {
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },

  // Category filter (inside hero card)
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    fontSize: 12,
  },
  filterIconActive: {
    // emoji color can't be changed, but the text next to it will be white
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterLabelActive: {
    color: colors.white,
  },

  // Empty state card
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Placeholder topic previews
  placeholderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  placeholderCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.7,
  },
  placeholderIcon: {
    fontSize: 20,
  },
  placeholderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
});
