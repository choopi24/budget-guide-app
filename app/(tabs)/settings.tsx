import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import {
  useSettingsDb,
  type SupportedCurrency,
  type RolloverTarget,
  type WantRolloverTarget,
  type InvestRolloverTarget,
} from '../../db/settings';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/tokens';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CURRENCIES: { label: string; symbol: string; value: SupportedCurrency }[] = [
  { label: 'Israeli Shekel', symbol: '₪', value: 'ILS' },
  { label: 'US Dollar',      symbol: '$', value: 'USD' },
  { label: 'Euro',           symbol: '€', value: 'EUR' },
];

type RolloverOption = {
  value: 'invest' | 'want' | 'must';
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
  desc: string;
};

const ROLLOVER_OPTIONS: RolloverOption[] = [
  {
    value: 'invest',
    label: 'Invest',
    icon:  'stats-chart',
    color: colors.keep,
    bg:    '#EBF1FA',
    desc:  'Surplus rolls into your invest bucket',
  },
  {
    value: 'want',
    label: 'Want',
    icon:  'bag-handle',
    color: colors.want,
    bg:    colors.wantSoft,
    desc:  'Surplus carries forward to your want budget',
  },
  {
    value: 'must',
    label: 'Must',
    icon:  'shield-checkmark',
    color: colors.must,
    bg:    colors.mustSoft,
    desc:  "Surplus rolls into next month's Must budget",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RolloverPicker({
  value,
  onChange,
}: {
  value: 'invest' | 'want' | 'must';
  onChange: (v: 'invest' | 'want' | 'must') => void;
}) {
  const selected = ROLLOVER_OPTIONS.find((o) => o.value === value) ?? ROLLOVER_OPTIONS[0];

  return (
    <View style={pickerStyles.root}>
      {/* 3-button toggle row */}
      <View style={pickerStyles.toggleRow}>
        {ROLLOVER_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                pickerStyles.toggleBtn,
                active && { backgroundColor: opt.bg, borderColor: opt.color },
                pressed && !active && pickerStyles.toggleBtnPressed,
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={active ? opt.color : colors.textMuted}
              />
              <Text
                style={[
                  pickerStyles.toggleLabel,
                  active && { color: opt.color, fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Description of selected option */}
      <View style={[pickerStyles.descRow, { borderLeftColor: selected.color }]}>
        <Text style={pickerStyles.descText}>{selected.desc}</Text>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  root: { marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  toggleBtnPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  descRow: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 2,
    borderRadius: 2,
  },
  descText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { getCurrency, updateCurrency, getRolloverSettings, updateRolloverSettings } = useSettingsDb();

  const [currency,       setCurrency]       = useState<SupportedCurrency>('ILS');
  const [mustRollover,   setMustRollover]   = useState<RolloverTarget>('invest');
  const [wantRollover,   setWantRollover]   = useState<WantRolloverTarget>('want');
  const [investRollover, setInvestRollover] = useState<InvestRolloverTarget>('invest');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [saved, rollover] = await Promise.all([getCurrency(), getRolloverSettings()]);
      if (mounted) {
        setCurrency(saved);
        setMustRollover(rollover.mustRolloverTarget);
        setWantRollover(rollover.wantRolloverTarget);
        setInvestRollover(rollover.investRolloverTarget);
      }
    }
    load();
    return () => { mounted = false; };
  }, [getCurrency, getRolloverSettings]);

  async function handleCurrencyChange(next: SupportedCurrency) {
    setCurrency(next);
    await updateCurrency(next);
  }

  async function handleMustRolloverChange(value: RolloverTarget) {
    setMustRollover(value);
    await updateRolloverSettings({ mustRolloverTarget: value });
  }

  async function handleWantRolloverChange(value: WantRolloverTarget) {
    setWantRollover(value);
    await updateRolloverSettings({ wantRolloverTarget: value });
  }

  async function handleInvestRolloverChange(value: InvestRolloverTarget) {
    setInvestRollover(value);
    await updateRolloverSettings({ investRolloverTarget: value });
  }

  async function resetApp() {
    await db.execAsync(`
      DELETE FROM expenses;
      DELETE FROM months;
      DELETE FROM savings_updates;
      DELETE FROM savings_items;

      UPDATE app_settings
      SET
        onboarding_completed = 0,
        default_must_pct = 50,
        default_want_pct = 20,
        default_keep_pct = 30,
        currency = 'ILS',
        updated_at = datetime('now')
      WHERE id = 1;

      UPDATE profile
      SET
        name = NULL,
        email = NULL,
        age = NULL,
        birthday = NULL,
        occupation = NULL,
        updated_at = datetime('now')
      WHERE id = 1;

      UPDATE streak
      SET
        join_date = date('now'),
        last_open_date = date('now'),
        current_streak = 1,
        longest_streak = 1
      WHERE id = 1;

      UPDATE avatar_config
      SET
        skin_tone = 's2',
        hair_style = 'clean',
        hair_color = 'dkbrown',
        suit_color = 'navy',
        hat = 'none',
        glasses = 'none',
        extra = 'none',
        eye_shape = 'default'
      WHERE id = 1;

      UPDATE achievements SET unlocked_at = NULL;
    `);
    router.replace('/onboarding');
  }

  return (
    <AppScreen scroll>

      {/* ── Page header ── */}
      <View style={styles.pageHeader}>
        <SectionLabel style={styles.eyebrow}>Preferences</SectionLabel>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* ── Currency ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currency</Text>
        <Text style={styles.sectionSubtitle}>Used throughout the app for all money values.</Text>
        <View style={styles.optionList}>
          {CURRENCIES.map((item, idx) => {
            const active = currency === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => handleCurrencyChange(item.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  idx < CURRENCIES.length - 1 && styles.optionRowBorder,
                  pressed && styles.optionRowPressed,
                ]}
              >
                <View style={[styles.optionIconBox, active && styles.optionIconBoxActive]}>
                  <Text style={[styles.optionSymbol, active && styles.optionSymbolActive]}>
                    {item.symbol}
                  </Text>
                </View>
                <View style={styles.optionTextGroup}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {item.value}
                  </Text>
                  <Text style={styles.optionDesc}>{item.label}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Leftover handling header ── */}
      <View style={styles.sectionGroupHeader}>
        <Text style={styles.sectionGroupTitle}>Leftover handling</Text>
        <Text style={styles.sectionGroupSubtitle}>
          Choose where each bucket's unspent balance goes when you close the month.
        </Text>
      </View>

      {/* ── Must leftover ── */}
      <View style={[styles.section, styles.rolloverSection]}>
        <View style={styles.rolloverHeader}>
          <View style={[styles.rolloverDot, { backgroundColor: colors.must }]} />
          <View>
            <Text style={styles.sectionTitle}>Must leftover</Text>
            <Text style={styles.sectionSubtitle}>Unspent from your essential expenses.</Text>
          </View>
        </View>
        <RolloverPicker value={mustRollover} onChange={handleMustRolloverChange} />
      </View>

      {/* ── Want leftover ── */}
      <View style={[styles.section, styles.rolloverSection]}>
        <View style={styles.rolloverHeader}>
          <View style={[styles.rolloverDot, { backgroundColor: colors.want }]} />
          <View>
            <Text style={styles.sectionTitle}>Want leftover</Text>
            <Text style={styles.sectionSubtitle}>Unspent from your discretionary budget.</Text>
          </View>
        </View>
        <RolloverPicker value={wantRollover} onChange={handleWantRolloverChange} />
      </View>

      {/* ── Invest leftover ── */}
      <View style={[styles.section, styles.rolloverSection]}>
        <View style={styles.rolloverHeader}>
          <View style={[styles.rolloverDot, { backgroundColor: colors.keep }]} />
          <View>
            <Text style={styles.sectionTitle}>Invest leftover</Text>
            <Text style={styles.sectionSubtitle}>Unspent from your invest budget.</Text>
          </View>
        </View>
        <RolloverPicker value={investRollover} onChange={handleInvestRolloverChange} />
      </View>

      {/* ── Danger zone ── */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger zone</Text>
        <Text style={styles.sectionSubtitle}>
          Clears all months, expenses and investments. Restarts from onboarding.
        </Text>
        <Button
          label="Reset app data"
          variant="danger"
          size="md"
          onPress={resetApp}
          style={{ marginTop: spacing[1] }}
        />
      </View>

    </AppScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 8,
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
    marginBottom: 20,
  },

  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },

  // Rollover section
  rolloverSection: {
    marginBottom: 10,
  },
  rolloverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  rolloverDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 5,
    flexShrink: 0,
  },

  // Group header above the 3 rollover cards
  sectionGroupHeader: {
    paddingHorizontal: 4,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionGroupSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // Option list (currency radio rows)
  optionList: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionRowPressed: { backgroundColor: colors.surfaceSoft },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIconBoxActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  optionSymbol: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  optionSymbolActive: { color: colors.primary },
  optionTextGroup:    { flex: 1 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 1,
  },
  optionLabelActive: { color: colors.text },
  optionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive:  { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  // Danger zone
  dangerSection: {
    borderWidth: 1.5,
    borderColor: colors.danger + '30',
    marginBottom: 32,
    marginTop: 8,
  },
  dangerTitle: { color: colors.danger },
});
