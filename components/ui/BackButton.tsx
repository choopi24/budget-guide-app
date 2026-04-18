import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/tokens';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
};

/**
 * Pill-shaped back navigation button.
 * Chevron icon + optional label (defaults to "Back").
 *
 * Usage:
 *   <BackButton onPress={() => router.back()} />
 *   <BackButton onPress={() => router.back()} label="Cancel" />
 */
export function BackButton({ onPress, label = 'Back' }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Ionicons name="chevron-back" size={16} color={colors.text} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingLeft: spacing[2] + 2,
    paddingRight: spacing[3] + 2,
    ...shadows.sm,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
