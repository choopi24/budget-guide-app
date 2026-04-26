import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/tokens';

type ChipProps = {
  label: string;
  emoji?: string;
  active?: boolean;
  activeColor?: string;
  activeBgColor?: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({
  label,
  emoji,
  active = false,
  activeColor = colors.primary,
  activeBgColor = colors.surfaceSoft,
  disabled = false,
  onPress,
  accessibilityLabel,
}: ChipProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: activeBgColor, borderColor: activeColor },
        disabled && styles.disabled,
        pressed && !active && !disabled && styles.pressed,
      ]}
    >
      {emoji ? <Text style={[styles.emoji, disabled && styles.disabledText]}>{emoji}</Text> : null}
      <Text style={[styles.text, active && { color: activeColor }, disabled && styles.disabledText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  emoji: { fontSize: 15 },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  disabled: {
    opacity: 0.35,
  },
  disabledText: {
    color: colors.textTertiary,
  },
});
