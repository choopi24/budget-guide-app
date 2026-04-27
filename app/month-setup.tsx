import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useMonthsDb } from '../db/months';
import { getCurrentMonthKey, getMonthLabelFromKey } from '../lib/date';
import { formatCentsToMoney, parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

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
      <Card variant="outlined">
        <SectionLabel style={styles.eyebrow}>Month setup</SectionLabel>
        <Text style={styles.title}>
          Build your plan for {getMonthLabelFromKey(currentMonthKey)}.
        </Text>
        <Text style={styles.body}>
          {"Enter your net income and we'll map it into your default Must, Want, and Keep plan."}
        </Text>

        <Input
          label="Net income"
          value={income}
          onChangeText={setIncome}
          placeholder="5000"
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          autoFocus
          accessibilityLabel="Net income"
          containerStyle={styles.field}
          style={styles.incomeInput}
        />

        <Card variant="outlined" padding={16} style={styles.previewCard}>
          <Text style={styles.previewTitle}>{"This month's plan"}</Text>

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
        </Card>

        <Text style={styles.note}>
          {keepBonus > 0 || wantBonus > 0
            ? `Rollover from last month: ${[
                keepBonus > 0 ? `Invest ${formatCentsToMoney(keepBonus)}` : '',
                wantBonus > 0 ? `Want ${formatCentsToMoney(wantBonus)}` : '',
              ].filter(Boolean).join(', ')}`
            : 'No rollover from last month.'}
        </Text>

        <Button
          label={saving ? 'Saving…' : 'Start this month'}
          onPress={handleContinue}
          disabled={!canContinue}
          loading={saving}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
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
        <Text style={[styles.previewLabel, isBonus && { color: colors.primary }]}>{label}</Text>
      </View>
      <Text style={[styles.previewValue, isBonus && { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
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
    marginTop: spacing[5],
  },
  incomeInput: {
    fontSize: 18,
  },
  previewCard: {
    marginTop: spacing[5],
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
});