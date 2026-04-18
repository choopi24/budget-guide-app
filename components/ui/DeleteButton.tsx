import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/tokens';

type DeleteButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/**
 * Circular 38×38 danger icon button.
 * Used in edit screen top-bars (trash icon, danger color).
 *
 * Usage:
 *   <DeleteButton onPress={handleDelete} accessibilityLabel="Delete expense" />
 */
export function DeleteButton({ onPress, accessibilityLabel = 'Delete' }: DeleteButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Ionicons name="trash-outline" size={16} color={colors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
