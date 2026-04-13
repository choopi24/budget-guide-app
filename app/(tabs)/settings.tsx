import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSettingsDb, type SupportedCurrency, type RolloverTarget, type WantRolloverTarget } from '../../db/settings';
import { colors } from '../../theme/colors';

const CURRENCIES: { label: string; symbol: string; value: SupportedCurrency }[] = [
  { label: 'Israeli Shekel', symbol: '₪', value: 'ILS' },
  { label: 'US Dollar',      symbol: '$', value: 'USD' },
  { label: 'Euro',           symbol: '€', value: 'EUR' },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { getCurrency, updateCurrency, getRolloverSettings, updateRolloverSettings } = useSettingsDb();
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');
  const [mustRollover, setMustRollover] = useState<RolloverTarget>('invest');
  const [wantRollover, setWantRollover] = useState<WantRolloverTarget>('want');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [saved, rollover] = await Promise.all([getCurrency(), getRolloverSettings()]);
      if (mounted) {
        setCurrency(saved);
        setMustRollover(rollover.mustRolloverTarget);
        setWantRollover(rollover.wantRolloverTarget);
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
    `);
    router.replace('/onboarding');
  }

  return (
    <AppScreen scroll>

      {/* ── Page header ──────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>Preferences</Text>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* ── Currency ─────────────────────────────────── */}
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

      {/* ── Rollover — Must ──────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Must leftover</Text>
        <Text style={styles.sectionSubtitle}>
          What happens to unspent "Must" budget at month close.
        </Text>
        <View style={styles.optionList}>
          <Pressable
            onPress={() => handleMustRolloverChange('invest')}
            style={({ pressed }) => [
              styles.optionRow,
              styles.optionRowBorder,
              pressed && styles.optionRowPressed,
            ]}
          >
            <View style={[styles.optionIconBox, mustRollover === 'invest' && styles.optionIconBoxActive]}>
              <Text style={styles.optionSymbol}>📈</Text>
            </View>
            <View style={styles.optionTextGroup}>
              <Text style={[styles.optionLabel, mustRollover === 'invest' && styles.optionLabelActive]}>
                Move to Invest
              </Text>
              <Text style={styles.optionDesc}>Surplus rolls into your investment bucket</Text>
            </View>
            <View style={[styles.radio, mustRollover === 'invest' && styles.radioActive]}>
              {mustRollover === 'invest' && <View style={styles.radioDot} />}
            </View>
          </Pressable>
          <Pressable
            onPress={() => handleMustRolloverChange('discard')}
            style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          >
            <View style={[styles.optionIconBox, mustRollover === 'discard' && styles.optionIconBoxActive]}>
              <Text style={styles.optionSymbol}>✕</Text>
            </View>
            <View style={styles.optionTextGroup}>
              <Text style={[styles.optionLabel, mustRollover === 'discard' && styles.optionLabelActive]}>
                Discard
              </Text>
              <Text style={styles.optionDesc}>Surplus is cleared at month close</Text>
            </View>
            <View style={[styles.radio, mustRollover === 'discard' && styles.radioActive]}>
              {mustRollover === 'discard' && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Rollover — Want ──────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Want leftover</Text>
        <Text style={styles.sectionSubtitle}>
          What happens to unspent "Want" budget at month close.
        </Text>
        <View style={styles.optionList}>
          <Pressable
            onPress={() => handleWantRolloverChange('want')}
            style={({ pressed }) => [
              styles.optionRow,
              styles.optionRowBorder,
              pressed && styles.optionRowPressed,
            ]}
          >
            <View style={[styles.optionIconBox, wantRollover === 'want' && styles.optionIconBoxActive]}>
              <Text style={styles.optionSymbol}>🔄</Text>
            </View>
            <View style={styles.optionTextGroup}>
              <Text style={[styles.optionLabel, wantRollover === 'want' && styles.optionLabelActive]}>
                Roll into next Want
              </Text>
              <Text style={styles.optionDesc}>Surplus carries forward to next month</Text>
            </View>
            <View style={[styles.radio, wantRollover === 'want' && styles.radioActive]}>
              {wantRollover === 'want' && <View style={styles.radioDot} />}
            </View>
          </Pressable>
          <Pressable
            onPress={() => handleWantRolloverChange('discard')}
            style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          >
            <View style={[styles.optionIconBox, wantRollover === 'discard' && styles.optionIconBoxActive]}>
              <Text style={styles.optionSymbol}>✕</Text>
            </View>
            <View style={styles.optionTextGroup}>
              <Text style={[styles.optionLabel, wantRollover === 'discard' && styles.optionLabelActive]}>
                Discard
              </Text>
              <Text style={styles.optionDesc}>Surplus is cleared at month close</Text>
            </View>
            <View style={[styles.radio, wantRollover === 'discard' && styles.radioActive]}>
              {wantRollover === 'discard' && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Danger zone ──────────────────────────────── */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger zone</Text>
        <Text style={styles.sectionSubtitle}>
          Clears all months, expenses and investments. Restarts from onboarding.
        </Text>
        <Pressable
          onPress={resetApp}
          style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerButtonPressed]}
        >
          <Text style={styles.dangerButtonText}>Reset app data</Text>
        </Pressable>
      </View>

    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  // Section
  section: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },

  // Option list (radio-style rows)
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
  optionRowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
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
  optionSymbolActive: {
    color: colors.primary,
  },
  optionTextGroup: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 1,
  },
  optionLabelActive: {
    color: colors.text,
  },
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
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  // Danger zone
  dangerSection: {
    borderWidth: 1.5,
    borderColor: '#B6523A30',
    marginBottom: 32,
  },
  dangerTitle: {
    color: colors.danger,
  },
  dangerButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonPressed: {
    opacity: 0.85,
  },
  dangerButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
