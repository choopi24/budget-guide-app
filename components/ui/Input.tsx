import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing, type as typeScale } from '../../theme/tokens';

type InputProps = TextInputProps & {
  /** Label rendered above the field */
  label?: string;
  /** Small helper text rendered below the field */
  hint?: string;
  /** Error message — replaces hint when set; also tints the border red */
  error?: string;
  containerStyle?: ViewStyle;
};

/**
 * A consistent, labelled text input.
 *
 * Forwards its ref so keyboard-chaining works:
 *   const nextRef = useRef<TextInput>(null);
 *   <Input ref={nextRef} ... />
 *
 * Usage:
 *   <Input label="Amount" keyboardType="decimal-pad" value={v} onChangeText={setV} />
 *   <Input label="Note" hint="Optional" multiline style={styles.tall} />
 *   <Input label="Email" error={emailError} />
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, containerStyle, style, ...props },
  ref,
) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    ...typeScale.subhead,
    color: colors.text,
    marginBottom: spacing[2],
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    fontSize: typeScale.body.fontSize,
    fontWeight: typeScale.body.fontWeight,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    ...typeScale.caption,
    color: colors.textTertiary,
    marginTop: spacing[1],
  },
  error: {
    ...typeScale.caption,
    color: colors.danger,
    fontWeight: '600',
    marginTop: spacing[1],
  },
});
