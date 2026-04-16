import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useMonthsDb } from '../db/months';
import { getCurrentMonthKey, getMonthLabelFromKey } from '../lib/date';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';

export default function MonthSetupScreen() {
  const router = useRouter();
  const { getDefaultSplit, getActiveMonth, createCurrentMonth, getPreviousMonthRollover } = useMonthsDb();

  const currentMonthKey = getCurrentMonthKey();

  const [income, setIncome] = useState('');
  const [mustPct, setMustPct] = useState(50);
  const [wantPct, setWantPct] = useState(20);
  const [keepPct, setKeepPct] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keepBonus, setKeepBonus] = useState(0);
  const [wantBonus, setWantBonus] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const activeMonth = await getActiveMonth();

      if (activeMonth?.month_key === currentMonthKey) {
        router.replace('/(tabs)/home');
        return;
      }

      const [split, rollover] = await Promise.all([
        getDefaultSplit(),
        getPreviousMonthRollover(),
      ]);

      if (!mounted) return;

      setMustPct(split.mustPct);
      setWantPct(split.wantPct);
      setKeepPct(split.keepPct);
      setKeepBonus(rollover.keepBonus);
      setWantBonus(rollover.wantBonus);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [currentMonthKey, getActiveMonth, getDefaultSplit, getPreviousMonthRollover, router]);

  const incomeCents = useMemo(() => parseMoneyToCents(income), [income]);

  const mustBudget = useMemo(
    () => Math.round(incomeCents * (mustPct / 100)),
    [incomeCents, mustPct]
  );

  const wantBudget = useMemo(
    () => Math.round(incomeCents * (wantPct / 100)),
    [incomeCents, wantPct]
  );

  const keepBudget = useMemo(
    () => incomeCents - mustBudget - wantBudget,
    [incomeCents, mustBudget, wantBudget]
  );

  const canContinue = incomeCents > 0 && !saving && !loading;

  async function handleContinue() {
    if (!canContinue) return;

    setSaving(true);

    try {
      await createCurrentMonth({
        incomeCents,
      });

      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <Text style={styles.body}>Loading month setup...</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Month setup</Text>
        <Text style={styles.title}>
          Build your plan for {getMonthLabelFromKey(currentMonthKey)}.
        </Text>
        <Text style={styles.body}>
          Enter your net income and we'll map it into your default Must, Want, and Keep plan.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Net income</Text>
          <TextInput
            value={income}
            onChangeText={setIncome}
            placeholder="5000"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            style={styles.input}
            autoFocus
            accessibilityLabel="Net income"
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>This month's plan</Text>

          <PreviewRow
            label={`Must (${mustPct}%)`}
            value={formatCentsToMoney(mustBudget)}
            color={colors.must}
          />
          <PreviewRow
            label={`Want (${wantPct}%)`}
            value={formatCentsToMoney(wantBudget)}
            color={colors.want}
          />
          <PreviewRow
            label={`Keep (${keepPct}%)`}
            value={formatCentsToMoney(keepBudget)}
            color={colors.keep}
          />

          {wantBonus > 0 && (
            <PreviewRow
              label="+ Want rollover"
              value={formatCentsToMoney(wantBonus)}
              color={colors.want}
              isBonus
            />
          )}
          {keepBonus > 0 && (
            <PreviewRow
              label="+ Invest rollover"
              value={formatCentsToMoney(keepBonus)}
              color={colors.keep}
              isBonus
            />
          )}
        </View>

        <Text style={styles.note}>
          {keepBonus > 0 || wantBonus > 0
            ? `Rollover from last month: ${[
                keepBonus > 0 ? `Invest ${formatCentsToMoney(keepBonus)}` : '',
                wantBonus > 0 ? `Want ${formatCentsToMoney(wantBonus)}` : '',
              ].filter(Boolean).join(', ')}`
            : 'No rollover from last month.'}
        </Text>

        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel="Start this month"
          accessibilityState={{ disabled: !canContinue }}
          style={({ pressed }) => [
            styles.button,
            (!canContinue || pressed) && styles.buttonPressed,
            !canContinue && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Start this month'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function PreviewRow({
  label,
  value,
  color,
  isBonus = false,
}: {
  label: string;
  value: string;
  color: string;
  isBonus?: boolean;
}) {
  return (
    <View style={styles.previewRow}>
      <View style={styles.previewLeft}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.previewLabel, isBonus && { color: '#2F7D57' }]}>{label}</Text>
      </View>
      <Text style={[styles.previewValue, isBonus && { color: '#2F7D57' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  field: {
    marginTop: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.text,
  },
  previewCard: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 15,
    color: colors.text,
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  note: {
    marginTop: 14,
    fontSize: 14,
    color: colors.textMuted,
  },
  button: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});