import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/tokens';

type ChipProps = {
  label: string;
  emoji?: string;
  active?: boolean;
  activeColor?: string;
  activeBgColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({
  label,
  emoji,
  active = false,
  activeColor = colors.primary,
  activeBgColor = colors.surfaceSoft,
  onPress,
  accessibilityLabel,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: activeBgColor, borderColor: activeColor },
        pressed && !active && styles.pressed,
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.text, active && { color: activeColor }]}>{label}</Text>
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
});
