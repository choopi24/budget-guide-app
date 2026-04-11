import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSettingsDb, type SupportedCurrency } from '../../db/settings';
import { colors } from '../../theme/colors';

const currencies: { label: string; value: SupportedCurrency }[] = [
  { label: 'NIS', value: 'ILS' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { getCurrency, updateCurrency } = useSettingsDb();
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  useEffect(() => {
    let mounted = true;

    async function load() {
      const saved = await getCurrency();
      if (mounted) {
        setCurrency(saved);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [getCurrency]);

  async function handleCurrencyChange(nextCurrency: SupportedCurrency) {
    setCurrency(nextCurrency);
    await updateCurrency(nextCurrency);
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
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Preferences</Text>
        <Text style={styles.body}>
          Choose how money should be displayed in the app.
        </Text>

        <Text style={styles.sectionLabel}>Currency</Text>

        <View style={styles.segmentRow}>
          {currencies.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => handleCurrencyChange(item.value)}
              style={[
                styles.segmentButton,
                currency === item.value && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  currency === item.value && styles.segmentTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>Developer reset</Text>
        <Text style={styles.body}>
          Clear onboarding and local month data to test from the beginning.
        </Text>

        <Pressable
          onPress={resetApp}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Reset app</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});