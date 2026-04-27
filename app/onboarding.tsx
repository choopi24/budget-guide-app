import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMonthsDb } from '../db/months';
import { useSettingsDb, type SupportedCurrency } from '../db/settings';
import { parseMoneyToCents } from '../lib/money';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

type BudgetPreset = '503020' | '502030' | 'custom';

type PresetConfig = {
  must: number;
  want: number;
  keep: number;
  label: string;
  tagline: string;
};

const PRESETS: Record<Exclude<BudgetPreset, 'custom'>, PresetConfig> = {
  '503020': {
    must: 50, want: 30, keep: 20,
    label: 'Balanced',
    tagline: 'More room for lifestyle, stable future base.',
  },
  '502030': {
    must: 50, want: 20, keep: 30,
    label: 'Growth',
    tagline: 'Lean lifestyle, strong investment priority.',
  },
};

const CURRENCIES: { label: string; sublabel: string; value: SupportedCurrency }[] = [
  { label: '₪ NIS', sublabel: 'Israeli Shekel', value: 'ILS' },
  { label: '$ USD', sublabel: 'US Dollar',      value: 'USD' },
  { label: '€ EUR', sublabel: 'Euro',            value: 'EUR' },
];

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dots.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dots.dot, i + 1 === current ? dots.active : i + 1 < current ? dots.done : dots.idle]}
        />
      ))}
    </View>
  );
}

const dots = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 28 },
  dot:    { height: 6, borderRadius: radius.full },
  active: { width: 22, backgroundColor: colors.primary },
  done:   { width: 6,  backgroundColor: colors.primary + '55' },
  idle:   { width: 6,  backgroundColor: colors.border },
});

// ─── Split visualization bar ──────────────────────────────────────────────────

function SplitBar({ must, want, keep }: { must: number; want: number; keep: number }) {
  return (
    <View style={bar.track}>
      <View style={[bar.seg, { flex: must, backgroundColor: colors.must }]} />
      <View style={[bar.seg, { flex: want, backgroundColor: colors.want }]} />
      <View style={[bar.seg, { flex: keep, backgroundColor: colors.keep }]} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: { flexDirection: 'row', height: 5, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing[3] },
  seg:   {},
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveOnboarding, updateCurrency } = useSettingsDb();
  const { createCurrentMonth } = useMonthsDb();

  const [step, setStep] = useState(0);

  // Step 1 — Profile
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>('ILS');

  // Step 2 — Budget
  const [preset,      setPreset]      = useState<BudgetPreset>('502030');
  const [customMust,  setCustomMust]  = useState('50');
  const [customWant,  setCustomWant]  = useState('20');
  const [customKeep,  setCustomKeep]  = useState('30');

  // Step 3 — Income
  const [income, setIncome] = useState('');
  const [saving, setSaving] = useState(false);

  const activeMust = preset === 'custom' ? (Number(customMust) || 0) : PRESETS[preset as Exclude<BudgetPreset, 'custom'>].must;
  const activeWant = preset === 'custom' ? (Number(customWant) || 0) : PRESETS[preset as Exclude<BudgetPreset, 'custom'>].want;
  const activeKeep = preset === 'custom' ? (Number(customKeep) || 0) : PRESETS[preset as Exclude<BudgetPreset, 'custom'>].keep;
  const totalPct   = activeMust + activeWant + activeKeep;

  const incomeCents  = useMemo(() => parseMoneyToCents(income), [income]);
  const customValid  = preset !== 'custom' || totalPct === 100;
  const canFinish    = incomeCents > 0 && customValid && !saving;

  async function handleFinish() {
    if (!canFinish) return;
    setSaving(true);
    try {
      await updateCurrency(currency);
      await saveOnboarding({
        name:    name.trim()  || undefined,
        email:   email.trim() || undefined,
        mustPct: activeMust,
        wantPct: activeWant,
        keepPct: activeKeep,
      });
      await createCurrentMonth({ incomeCents });
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  }

  // ── Welcome ───────────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <SafeAreaView style={welcome.safeArea}>
        <View style={welcome.container}>

          {/* Brand mark */}
          <View style={welcome.markRow}>
            <View style={welcome.markDot} />
            <View style={[welcome.markDot, welcome.markDotMid]} />
            <View style={welcome.markDot} />
          </View>

          {/* Hero copy */}
          <View style={welcome.copyBlock}>
            <Text style={welcome.headline}>Your income,{'\n'}working for you.</Text>
            <Text style={welcome.subline}>
              Know exactly where your money goes — and make sure some of it grows.
            </Text>
          </View>

          {/* Value props */}
          <View style={welcome.propsBlock}>
            <ValueProp icon="↗" label="Log an expense in under 10 seconds" />
            <ValueProp icon="◎" label="Split your income into Must, Want & Invest — once" />
            <ValueProp icon="◆" label="Track every investment and see your net worth grow" />
          </View>

          {/* CTA */}
          <View style={welcome.ctaBlock}>
            <Pressable
              onPress={() => setStep(1)}
              style={({ pressed }) => [welcome.primaryBtn, pressed && welcome.primaryBtnPressed]}
            >
              <Text style={welcome.primaryBtnText}>Get started</Text>
            </Pressable>
            <Text style={welcome.footerNote}>Takes about a minute to set up.</Text>
            <Text style={welcome.privacyNote}>🔒 All data stays on your device</Text>
          </View>

        </View>
      </SafeAreaView>
    );
  }

  // ── Steps 1–3 ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back button */}
        <View style={s.topBar}>
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepDots current={step} total={3} />

          {/* ── Step 1: Profile ─────────────────────────────────────────── */}
          {step === 1 && (
            <View style={s.card}>
              <Text style={s.stepEyebrow}>Step 1 of 3</Text>
              <Text style={s.stepTitle}>A bit about you</Text>
              <Text style={s.stepBody}>
                Optional. Used to personalise your dashboard and greet you by name.
              </Text>

              <FieldRow label="Nickname">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="What should we call you?"
                  placeholderTextColor={colors.textTertiary}
                  style={s.input}
                  autoCorrect={false}
                />
              </FieldRow>

              <FieldRow label="Email">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={s.input}
                />
              </FieldRow>

              <View style={s.divider} />

              <FieldRow label="Currency">
                <View style={s.pillRow}>
                  {CURRENCIES.map((c) => (
                    <Pressable
                      key={c.value}
                      onPress={() => setCurrency(c.value)}
                      style={[s.pill, currency === c.value && s.pillActive]}
                    >
                      <Text style={[s.pillText, currency === c.value && s.pillTextActive]}>
                        {c.label}
                      </Text>
                      <Text style={[s.pillSub, currency === c.value && s.pillSubActive]}>
                        {c.sublabel}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </FieldRow>

              <Pressable
                onPress={() => setStep(2)}
                style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
              >
                <Text style={s.btnText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 2: Budget method ────────────────────────────────────── */}
          {step === 2 && (
            <View style={s.card}>
              <Text style={s.stepEyebrow}>Step 2 of 3</Text>
              <Text style={s.stepTitle}>Your budget split</Text>
              <Text style={s.stepBody}>
                Decide once how to divide your income. Every month, your budget builds itself from this rule.
              </Text>

              {/* Preset cards */}
              {(Object.entries(PRESETS) as [Exclude<BudgetPreset, 'custom'>, PresetConfig][]).map(([key, p]) => (
                <Pressable
                  key={key}
                  onPress={() => setPreset(key)}
                  style={[s.presetCard, preset === key && s.presetCardActive]}
                >
                  <View style={s.presetTopRow}>
                    <View style={s.presetLeft}>
                      <Text style={[s.presetLabel, preset === key && s.presetLabelActive]}>
                        {p.label}
                      </Text>
                      <Text style={s.presetTagline}>{p.tagline}</Text>
                    </View>
                    <View style={s.presetPcts}>
                      <SplitPct value={p.must} color={colors.must} label="Must" />
                      <SplitPct value={p.want} color={colors.want} label="Want" />
                      <SplitPct value={p.keep} color={colors.keep} label="Invest" />
                    </View>
                  </View>
                  <SplitBar must={p.must} want={p.want} keep={p.keep} />
                </Pressable>
              ))}

              {/* Custom card */}
              <Pressable
                onPress={() => setPreset('custom')}
                style={[s.presetCard, preset === 'custom' && s.presetCardActive]}
              >
                <View style={s.presetTopRow}>
                  <View style={s.presetLeft}>
                    <Text style={[s.presetLabel, preset === 'custom' && s.presetLabelActive]}>
                      Custom
                    </Text>
                    <Text style={s.presetTagline}>Define your own allocation.</Text>
                  </View>
                  {preset === 'custom' && (
                    <Text style={[s.presetLabel, totalPct === 100 ? { color: colors.primary } : { color: colors.danger }]}>
                      {totalPct}%
                    </Text>
                  )}
                </View>

                {preset === 'custom' && (
                  <>
                    <SplitBar must={activeMust} want={activeWant} keep={activeKeep} />
                    <View style={s.customRow}>
                      <CustomSplit label="Must"   color={colors.must} value={customMust} onChangeText={setCustomMust} />
                      <CustomSplit label="Want"   color={colors.want} value={customWant} onChangeText={setCustomWant} />
                      <CustomSplit label="Invest" color={colors.keep} value={customKeep} onChangeText={setCustomKeep} />
                    </View>
                    {totalPct !== 100 && (
                      <Text style={s.splitError}>Must add up to 100% (currently {totalPct}%)</Text>
                    )}
                  </>
                )}
              </Pressable>

              {/* Legend */}
              <View style={s.legend}>
                <LegendItem color={colors.must} label="Must — Rent, bills, groceries" />
                <LegendItem color={colors.want} label="Want — Dining, leisure, extras" />
                <LegendItem color={colors.keep} label="Invest — Savings and investments" />
              </View>

              <Pressable
                onPress={() => { if (customValid) setStep(3); }}
                disabled={!customValid}
                style={({ pressed }) => [s.btn, (!customValid || pressed) && s.btnPressed, !customValid && s.btnDisabled]}
              >
                <Text style={s.btnText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 3: Income ────────────────────────────────────────────── */}
          {step === 3 && (
            <View style={s.card}>
              <Text style={s.stepEyebrow}>Step 3 of 3</Text>
              <Text style={s.stepTitle}>{"This month's income"}</Text>
              <Text style={s.stepBody}>
                Your net take-home pay. This sets your Must, Want, and Invest budgets for the month.
              </Text>

              <FieldRow label="Net income">
                <TextInput
                  value={income}
                  onChangeText={setIncome}
                  placeholder="5,000"
                  placeholderTextColor={colors.border}
                  keyboardType="decimal-pad"
                  style={[s.input, s.incomeInput]}
                  autoFocus
                />
              </FieldRow>

              {/* Preview */}
              {incomeCents > 0 && (
                <View style={s.previewCard}>
                  <Text style={s.previewTitle}>Monthly breakdown</Text>
                  <PreviewRow
                    label={`Must (${activeMust}%)`}
                    cents={Math.round(incomeCents * activeMust / 100)}
                    currency={currency}
                    color={colors.must}
                  />
                  <PreviewRow
                    label={`Want (${activeWant}%)`}
                    cents={Math.round(incomeCents * activeWant / 100)}
                    currency={currency}
                    color={colors.want}
                  />
                  <PreviewRow
                    label={`Invest (${activeKeep}%)`}
                    cents={incomeCents - Math.round(incomeCents * activeMust / 100) - Math.round(incomeCents * activeWant / 100)}
                    currency={currency}
                    color={colors.keep}
                  />
                </View>
              )}

              <Pressable
                onPress={handleFinish}
                disabled={!canFinish}
                style={({ pressed }) => [s.btn, (!canFinish || pressed) && s.btnPressed, !canFinish && s.btnDisabled]}
              >
                <Text style={s.btnText}>
                  {saving ? 'Setting up...' : 'Start budgeting'}
                </Text>
              </Pressable>

              <Text style={s.finalNote}>
                You can update your split and income any time.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ValueProp({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={vp.row}>
      <Text style={vp.icon}>{icon}</Text>
      <Text style={vp.label}>{label}</Text>
    </View>
  );
}

const vp = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: 14 },
  icon:  { fontSize: 14, color: colors.primary, width: 18, textAlign: 'center' },
  label: { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1, lineHeight: 21 },
});

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fr.wrap}>
      <Text style={fr.label}>{label}</Text>
      {children}
    </View>
  );
}

const fr = StyleSheet.create({
  wrap:  { marginTop: 18 },
  label: {
    fontSize: 11, fontWeight: '700', fontFamily: fonts.semiBold,
    color: colors.textTertiary, textTransform: 'uppercase',
    letterSpacing: 1.0, marginBottom: spacing[2],
  },
});

function SplitPct({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <View style={sp.box}>
      <Text style={[sp.value, { color }]}>{value}%</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  box:   { alignItems: 'center', minWidth: 36 },
  value: { fontSize: 14, fontWeight: '800', fontFamily: fonts.bold },
  label: { fontSize: 9, color: colors.textTertiary, fontWeight: '600', marginTop: 2 },
});

function CustomSplit({ label, color, value, onChangeText }: { label: string; color: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={cs.box}>
      <Text style={[cs.label, { color }]}>{label}</Text>
      <View style={cs.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          style={cs.input}
          selectTextOnFocus
        />
        <Text style={cs.pct}>%</Text>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  box:      { flex: 1, alignItems: 'center' },
  label:    { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input:    { fontSize: 22, fontWeight: '700', fontFamily: fonts.bold, color: colors.text, minWidth: 40, textAlign: 'center' },
  pct:      { fontSize: 13, color: colors.textMuted },
});

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={li.row}>
      <View style={[li.dot, { backgroundColor: color }]} />
      <Text style={li.label}>{label}</Text>
    </View>
  );
}

const li = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 6 },
  dot:   { width: 8, height: 8, borderRadius: radius.full },
  label: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});

function PreviewRow({ label, cents, currency, color }: { label: string; cents: number; currency: SupportedCurrency; color: string }) {
  const symbol    = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';
  const formatted = `${symbol}${Math.floor(cents / 100).toLocaleString()}`;
  return (
    <View style={pr.row}>
      <View style={[pr.indicator, { backgroundColor: color }]} />
      <Text style={pr.label}>{label}</Text>
      <Text style={pr.value}>{formatted}</Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  indicator: { width: 3, height: 20, borderRadius: radius.full },
  label:     { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500', lineHeight: 20 },
  value:     { fontSize: 15, fontWeight: '700', fontFamily: fonts.bold, color: colors.text, fontVariant: ['tabular-nums'] },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const welcome = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  markRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  markDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  markDotMid: {
    width: 12,
    height: 12,
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  copyBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 42,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1.2,
    lineHeight: 50,
    marginBottom: 18,
  },
  subline: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textMuted,
    maxWidth: 320,
  },
  propsBlock: {
    paddingVertical: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ctaBlock: {
    gap: 10,
  },
  primaryBtn: {
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.semiBold,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 0.1,
  },
});

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 6,
  },
  backText: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '300',
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: 40,
    flexGrow: 1,
  },

  // ── Card shell ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // ── Step header ──────────────────────────────────────────────────────────
  stepEyebrow: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 30,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: spacing[2],
  },
  stepBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 22,
  },

  // ── Text inputs ──────────────────────────────────────────────────────────
  input: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  incomeInput: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    height: 72,
    paddingHorizontal: 18,
    backgroundColor: colors.surfaceSoft,
  },

  // ── Currency pills ───────────────────────────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  pill: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  pillTextActive: {
    color: colors.primary,
  },
  pillSub: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  pillSubActive: {
    color: colors.primary,
    opacity: 0.7,
  },

  // ── Preset cards ─────────────────────────────────────────────────────────
  presetCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginTop: 14,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  presetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  presetLeft: {
    flex: 1,
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 3,
  },
  presetLabelActive: {
    color: colors.text,
  },
  presetTagline: {
    fontSize: 13,
    color: colors.textMuted,
    maxWidth: 180,
    lineHeight: 18,
  },
  presetPcts: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  customRow: {
    flexDirection: 'row',
    marginTop: spacing[4],
    gap: spacing[2],
  },
  splitError: {
    marginTop: 10,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
  legend: {
    marginTop: 18,
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  // ── Income preview card ──────────────────────────────────────────────────
  previewCard: {
    marginTop: spacing[5],
    backgroundColor: colors.panel,
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
  previewTitle: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 14,
  },

  // ── CTA button ───────────────────────────────────────────────────────────
  btn: {
    marginTop: 28,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    backgroundColor: colors.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  finalNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textTertiary,
  },
});
