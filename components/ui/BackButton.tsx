import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
};

export function BackButton({ onPress, label = 'Back' }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing[2],
    paddingRight: spacing[2],
    alignSelf: 'flex-start',
    marginBottom: spacing[1],
  },
  btnPressed: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
});
