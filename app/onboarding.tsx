import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useSettingsDb } from '../db/settings';
import { formatDateDisplay } from '../lib/date';
import { colors } from '../theme/colors';

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveOnboarding } = useSettingsDb();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [occupation, setOccupation] = useState('');

  const [mustPct, setMustPct] = useState('50');
  const [wantPct, setWantPct] = useState('20');
  const [keepPct, setKeepPct] = useState('30');

  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPct = useMemo(() => {
    const must = Number(mustPct) || 0;
    const want = Number(wantPct) || 0;
    const keep = Number(keepPct) || 0;
    return must + want + keep;
  }, [mustPct, wantPct, keepPct]);

  const canContinue = totalPct === 100 && !saving;

  async function handleContinue() {
    if (!canContinue) return;

    setSaving(true);

    try {
      await saveOnboarding({
        name,
        email,
        age: age.trim() ? Number(age) : null,
        birthday: birthday ? birthday.toISOString() : null,
        occupation,
        mustPct: Number(mustPct) || 0,
        wantPct: Number(wantPct) || 0,
        keepPct: Number(keepPct) || 0,
      });

      router.replace('/month-setup');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Welcome</Text>
        <Text style={styles.title}>Set the tone for how you want to budget.</Text>
        <Text style={styles.body}>
          A few details to personalize the app, then we’ll set your default monthly split.
        </Text>

        <Field label="Name (optional)">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Email (optional)">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </Field>

        <Field label="Age (optional)">
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="27"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Field>

        <Field label="Birthday (optional)">
          <Pressable
            onPress={() => setShowBirthdayPicker(true)}
            style={styles.inputButton}
          >
            <Text style={birthday ? styles.inputButtonText : styles.inputButtonPlaceholder}>
              {birthday ? formatDateDisplay(birthday.toISOString()) : 'Choose a date'}
            </Text>
          </Pressable>

          {showBirthdayPicker && (
            <DateTimePicker
              value={birthday ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') {
                  setShowBirthdayPicker(false);
                }
                if (selectedDate) {
                  setBirthday(selectedDate);
                }
              }}
            />
          )}

          {Platform.OS === 'ios' && showBirthdayPicker && (
            <View style={styles.inlinePickerFooter}>
              <Pressable
                onPress={() => setShowBirthdayPicker(false)}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>Done</Text>
              </Pressable>
            </View>
          )}
        </Field>

        <Field label="Occupation (optional)">
          <TextInput
            value={occupation}
            onChangeText={setOccupation}
            placeholder="What do you do?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Default monthly split</Text>
        <Text style={styles.body}>
          This is your starting balance between essentials, lifestyle, and future you.
        </Text>

        <View style={styles.splitRow}>
          <SplitInput label="Must" value={mustPct} onChangeText={setMustPct} color={colors.must} />
          <SplitInput label="Want" value={wantPct} onChangeText={setWantPct} color={colors.want} />
          <SplitInput label="Keep" value={keepPct} onChangeText={setKeepPct} color={colors.keep} />
        </View>

        <Text style={[styles.totalText, totalPct === 100 ? styles.totalOk : styles.totalBad]}>
          Total: {totalPct}%
        </Text>

        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.button,
            (!canContinue || pressed) && styles.buttonPressed,
            !canContinue && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SplitInput({
  label,
  value,
  onChangeText,
  color,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  color: string;
}) {
  return (
    <View style={styles.splitBox}>
      <Text style={[styles.splitLabel, { color }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        style={styles.splitInput}
      />
      <Text style={styles.percent}>%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  field: {
    marginTop: 14,
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
    fontSize: 16,
    color: colors.text,
  },
  inputButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  inputButtonPlaceholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
  inlinePickerFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  smallButton: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  splitBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
  },
  splitLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  splitInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 4,
  },
  percent: {
    fontSize: 13,
    color: colors.textMuted,
  },
  totalText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  totalOk: {
    color: colors.primary,
  },
  totalBad: {
    color: '#B6523A',
  },
  button: {
    marginTop: 24,
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
    backgroundColor: '#9DB8AA',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});