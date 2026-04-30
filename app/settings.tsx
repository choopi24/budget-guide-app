import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '../components/AppScreen';
import { BackButton } from '../components/ui/BackButton';
import { Button } from '../components/ui/Button';
import {
  useSettingsDb,
  type SupportedCurrency,
  type RolloverTarget,
  type WantRolloverTarget,
  type InvestRolloverTarget,
} from '../db/settings';
import { SectionLabel } from '../components/ui/SectionLabel';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { exportMonths, exportExpenses, exportInvestments } from '../lib/export';
import {
  exportBackup,
  pickAndValidateBackup,
  readRestorePreview,
  restoreFromBackup,
  type BackupFile,
  type RestorePreview,
} from '../lib/backup';

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

const EXPORT_ROWS: {
  id: 'months' | 'expenses' | 'investments';
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}[] = [
  {
    id: 'months',
    label: 'Monthly budgets',
    desc: 'Income, budgets, spending totals per month',
    icon: 'calendar-outline',
    color: colors.primary,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    desc: 'Every transaction across all months',
    icon: 'receipt-outline',
    color: colors.want,
  },
  {
    id: 'investments',
    label: 'Investments',
    desc: 'Portfolio snapshot with current values',
    icon: 'stats-chart-outline',
    color: colors.keep,
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
      <View style={pickerStyles.toggleRow}>
        {ROLLOVER_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="radio"
              accessibilityLabel={opt.label}
              accessibilityHint={opt.desc}
              accessibilityState={{ selected: active }}
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

  const insets = useSafeAreaInsets();
  const [currency,       setCurrency]       = useState<SupportedCurrency>('ILS');
  const [mustRollover,   setMustRollover]   = useState<RolloverTarget>('invest');
  const [wantRollover,   setWantRollover]   = useState<WantRolloverTarget>('want');
  const [investRollover, setInvestRollover] = useState<InvestRolloverTarget>('invest');
  const [exporting, setExporting] = useState<'months' | 'expenses' | 'investments' | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<{
    backup: BackupFile;
    preview: RestorePreview;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

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

  async function handleExport(type: 'months' | 'expenses' | 'investments') {
    setExporting(type);
    try {
      if (type === 'months')      await exportMonths(db);
      if (type === 'expenses')    await exportExpenses(db);
      if (type === 'investments') await exportInvestments(db);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Export failed', message);
    } finally {
      if (mountedRef.current) setExporting(null);
    }
  }

  async function handleCreateBackup() {
    setBackupBusy(true);
    try {
      await exportBackup(db);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Backup failed', message);
    } finally {
      if (mountedRef.current) setBackupBusy(false);
    }
  }

  async function handlePickRestore() {
    setBackupBusy(true);
    try {
      const backup = await pickAndValidateBackup();
      if (!backup) return; // cancelled
      const preview = readRestorePreview(backup);
      if (mountedRef.current) setRestoreCandidate({ backup, preview });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Could not read backup', message);
    } finally {
      if (mountedRef.current) setBackupBusy(false);
    }
  }

  async function handleConfirmRestore() {
    if (!restoreCandidate) return;
    setRestoring(true);
    try {
      await restoreFromBackup(db, restoreCandidate.backup);
      if (mountedRef.current) {
        setRestoreCandidate(null);
        router.replace('/(tabs)/home' as any);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Restore failed', `Your data was not changed.\n\n${message}`);
      if (mountedRef.current) setRestoring(false);
    }
  }

  async function resetApp() {
    await db.execAsync(`
      DELETE FROM recurring_logs;
      DELETE FROM recurring_expenses;
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
    <>
    {/* ── Restore preview modal ── */}
    <Modal
      visible={restoreCandidate !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !restoring && setRestoreCandidate(null)}
    >
      <View style={[modalStyles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView
          contentContainerStyle={modalStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.headerIconWrap}>
              <Ionicons name="cloud-download-outline" size={28} color={colors.primary} />
            </View>
            <Text style={modalStyles.headerTitle}>Restore Backup</Text>
            <Text style={modalStyles.headerSub}>
              Review the backup contents before restoring.
            </Text>
          </View>

          {/* Preview card */}
          {restoreCandidate && (
            <View style={modalStyles.previewCard}>
              <Text style={modalStyles.previewCardTitle}>Backup contents</Text>
              <View style={modalStyles.previewRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <Text style={modalStyles.previewLabel}>Months</Text>
                <Text style={modalStyles.previewValue}>{restoreCandidate.preview.monthCount}</Text>
              </View>
              <View style={[modalStyles.previewRow, modalStyles.previewRowBorder]}>
                <Ionicons name="receipt-outline" size={15} color={colors.textMuted} />
                <Text style={modalStyles.previewLabel}>Expenses</Text>
                <Text style={modalStyles.previewValue}>{restoreCandidate.preview.expenseCount}</Text>
              </View>
              <View style={[modalStyles.previewRow, modalStyles.previewRowBorder]}>
                <Ionicons name="stats-chart-outline" size={15} color={colors.textMuted} />
                <Text style={modalStyles.previewLabel}>Investments</Text>
                <Text style={modalStyles.previewValue}>{restoreCandidate.preview.investmentCount}</Text>
              </View>
              <View style={[modalStyles.previewRow, modalStyles.previewRowBorder]}>
                <Ionicons name="repeat-outline" size={15} color={colors.textMuted} />
                <Text style={modalStyles.previewLabel}>Recurring expenses</Text>
                <Text style={modalStyles.previewValue}>{restoreCandidate.preview.recurringCount}</Text>
              </View>
              <View style={[modalStyles.previewRow, modalStyles.previewRowBorder]}>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                <Text style={modalStyles.previewLabel}>Exported</Text>
                <Text style={[modalStyles.previewValue, modalStyles.previewValueSmall]}>
                  {new Date(restoreCandidate.preview.exportedAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Warning */}
          <View style={modalStyles.warningCard}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} style={{ flexShrink: 0 }} />
            <Text style={modalStyles.warningText}>
              Restoring will permanently replace{' '}
              <Text style={{ fontWeight: '700' }}>all current data</Text>
              {' '}— months, expenses, investments, and settings — with the contents of this backup. This cannot be undone.
            </Text>
          </View>

          {/* Buttons */}
          <Button
            label={restoring ? 'Restoring…' : 'Restore & Replace Data'}
            variant="danger"
            size="md"
            loading={restoring}
            onPress={handleConfirmRestore}
            style={modalStyles.restoreBtn}
          />
          <Pressable
            onPress={() => !restoring && setRestoreCandidate(null)}
            disabled={restoring}
            style={({ pressed }) => [modalStyles.cancelBtn, pressed && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel restore"
          >
            <Text style={modalStyles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>

    <AppScreen scroll>

      <BackButton onPress={() => router.back()} />

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
                accessibilityRole="radio"
                accessibilityLabel={`${item.label} (${item.value})`}
                accessibilityState={{ selected: active, checked: active }}
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
          {"Choose where each bucket's unspent balance goes when you close the month."}
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

      {/* ── Apple Pay Shortcut Setup ── */}
      <View style={styles.sectionGroupHeader}>
        <Text style={styles.sectionGroupTitle}>Apple Pay Shortcut Setup</Text>
        <Text style={styles.sectionGroupSubtitle}>
          Log expenses automatically when you pay with Apple Pay.
        </Text>
      </View>
      <View style={[styles.section, styles.shortcutSection]}>
        <View style={styles.shortcutStep}>
          <View style={styles.shortcutStepNum}><Text style={styles.shortcutStepNumText}>1</Text></View>
          <Text style={styles.shortcutStepText}>Open the Shortcuts app and go to <Text style={styles.shortcutBold}>Automation</Text>.</Text>
        </View>
        <View style={styles.shortcutStep}>
          <View style={styles.shortcutStepNum}><Text style={styles.shortcutStepNumText}>2</Text></View>
          <Text style={styles.shortcutStepText}>Tap <Text style={styles.shortcutBold}>New Automation</Text> → <Text style={styles.shortcutBold}>Transaction</Text>.</Text>
        </View>
        <View style={styles.shortcutStep}>
          <View style={styles.shortcutStepNum}><Text style={styles.shortcutStepNumText}>3</Text></View>
          <Text style={styles.shortcutStepText}>Choose your card and set it to trigger when you tap to pay.</Text>
        </View>
        <View style={styles.shortcutStep}>
          <View style={styles.shortcutStepNum}><Text style={styles.shortcutStepNumText}>4</Text></View>
          <Text style={styles.shortcutStepText}>Add an <Text style={styles.shortcutBold}>Open URLs</Text> action. Use this base URL:</Text>
        </View>
        <View style={styles.shortcutUrl}>
          <Text style={styles.shortcutUrlText} selectable>
            {'budgetbull://add-expense-from-shortcut'}
          </Text>
        </View>
        <View style={styles.shortcutStep}>
          <View style={styles.shortcutStepNum}><Text style={styles.shortcutStepNumText}>5</Text></View>
          <Text style={styles.shortcutStepText}>
            Append the transaction fields your Shortcut editor shows — for example{' '}
            <Text style={styles.shortcutCode}>?amount=</Text>,{' '}
            <Text style={styles.shortcutCode}>?merchant=</Text>,{' '}
            <Text style={styles.shortcutCode}>?date=</Text>, and{' '}
            <Text style={styles.shortcutCode}>source=applepay</Text>.
          </Text>
        </View>
        <View style={styles.shortcutNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.shortcutNoteText}>
            Not every iPhone exposes the same transaction fields. In the Shortcuts editor, insert whichever variables appear for your card — the app handles partial data gracefully.
          </Text>
        </View>
      </View>

      {/* ── Export CSV Files ── */}
      <View style={styles.sectionGroupHeader}>
        <Text style={styles.sectionGroupTitle}>Export CSV Files</Text>
        <Text style={styles.sectionGroupSubtitle}>
          CSV export is useful for spreadsheets and analysis. CSV files cannot be restored back to the app.
        </Text>
      </View>
      <View style={[styles.section, styles.exportSection]}>
        {EXPORT_ROWS.map((row, idx) => {
          const busy = exporting === row.id;
          const anyBusy = exporting !== null;
          return (
            <Pressable
              key={row.id}
              onPress={() => !anyBusy && handleExport(row.id)}
              disabled={anyBusy}
              accessibilityRole="button"
              accessibilityLabel={`Export ${row.label} as CSV`}
              accessibilityState={{ disabled: anyBusy, busy }}
              style={({ pressed }) => [
                styles.exportRow,
                idx < EXPORT_ROWS.length - 1 && styles.exportRowBorder,
                pressed && !anyBusy && styles.exportRowPressed,
                anyBusy && !busy && styles.exportRowDimmed,
              ]}
            >
              <View style={styles.exportIconBox}>
                <Ionicons name={row.icon} size={18} color={row.color} />
              </View>
              <View style={styles.exportTextGroup}>
                <Text style={styles.exportLabel}>{row.label}</Text>
                <Text style={styles.exportDesc}>{row.desc}</Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={20} color={anyBusy ? colors.border : colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Backup & Restore ── */}
      <View style={styles.sectionGroupHeader}>
        <Text style={styles.sectionGroupTitle}>Backup & Restore</Text>
        <Text style={styles.sectionGroupSubtitle}>
          Full backup saves everything — months, expenses, investments, and settings. To restore later: tap{' '}
          <Text style={styles.sectionGroupSubtitleBold}>Create Full Backup</Text>, save the file to your{' '}
          <Text style={styles.sectionGroupSubtitleBold}>Files app</Text>, then use{' '}
          <Text style={styles.sectionGroupSubtitleBold}>Restore From Backup</Text> to pick it.
        </Text>
      </View>
      <View style={[styles.section, styles.exportSection]}>
        {/* Create backup */}
        <Pressable
          onPress={() => !backupBusy && handleCreateBackup()}
          disabled={backupBusy}
          accessibilityRole="button"
          accessibilityLabel="Create full backup as JSON"
          accessibilityState={{ disabled: backupBusy, busy: backupBusy }}
          style={({ pressed }) => [
            styles.exportRow,
            styles.exportRowBorder,
            pressed && !backupBusy && styles.exportRowPressed,
            backupBusy && styles.exportRowDimmed,
          ]}
        >
          <View style={styles.exportIconBox}>
            <Ionicons name="archive-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.exportTextGroup}>
            <Text style={styles.exportLabel}>Create Full Backup</Text>
            <Text style={styles.exportDesc}>Saves all data to a .json file you can restore later</Text>
          </View>
          {backupBusy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="share-outline" size={20} color={colors.textMuted} />
          )}
        </Pressable>

        {/* Restore from backup */}
        <Pressable
          onPress={() => !backupBusy && handlePickRestore()}
          disabled={backupBusy}
          accessibilityRole="button"
          accessibilityLabel="Restore from a backup file"
          accessibilityState={{ disabled: backupBusy, busy: backupBusy }}
          style={({ pressed }) => [
            styles.exportRow,
            pressed && !backupBusy && styles.exportRowPressed,
            backupBusy && styles.exportRowDimmed,
          ]}
        >
          <View style={styles.exportIconBox}>
            <Ionicons name="cloud-download-outline" size={18} color={colors.keep} />
          </View>
          <View style={styles.exportTextGroup}>
            <Text style={styles.exportLabel}>Restore From Backup</Text>
            <Text style={styles.exportDesc}>Replace all app data with a previous backup file</Text>
          </View>
          {backupBusy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/* ── Privacy & Data ── */}
      <View style={styles.sectionGroupHeader}>
        <Text style={styles.sectionGroupTitle}>Privacy & Data</Text>
      </View>
      <Pressable
        onPress={() => router.push('/privacy' as any)}
        style={({ pressed }) => [styles.privacyLink, pressed && styles.privacyLinkPressed]}
        accessibilityRole="button"
        accessibilityLabel="Privacy and Data"
      >
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
        <Text style={styles.privacyLinkText}>How your data is stored and used</Text>
        <Ionicons name="chevron-forward" size={13} color={colors.border} style={{ marginLeft: 'auto' }} />
      </Pressable>

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
    </>
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
  sectionGroupSubtitleBold: {
    fontWeight: '600',
    color: colors.text,
  },

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

  shortcutSection: {
    marginBottom: 12,
  },
  shortcutStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  shortcutStepNum: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  shortcutStepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  shortcutStepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  shortcutBold: {
    fontWeight: '700',
    color: colors.text,
  },
  shortcutUrl: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  shortcutUrlText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  shortcutCode: {
    fontWeight: '600',
    color: colors.primary,
  },
  shortcutNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  shortcutNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  exportSection: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
  exportRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exportRowPressed: { backgroundColor: colors.surfaceSoft },
  exportRowDimmed: { opacity: 0.45 },
  exportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exportTextGroup: { flex: 1 },
  exportLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  exportDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },

  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: 4,
    marginTop: 4,
  },
  privacyLinkPressed: { opacity: 0.55 },
  privacyLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },

  dangerSection: {
    borderWidth: 1.5,
    borderColor: colors.danger + '30',
    marginBottom: 32,
    marginTop: 8,
  },
  dangerTitle: { color: colors.danger },
});

// ─── Restore modal styles ─────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  previewCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  previewRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  previewLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  previewValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    padding: 14,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    lineHeight: 19,
  },

  restoreBtn: {
    marginBottom: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
