import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../../lib/haptics';
import { colors } from '../../theme/colors';
import { FAB_BOTTOM_OFFSET, radius, spacing } from '../../theme/tokens';

type FabButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function FabButton({ onPress, accessibilityLabel = 'Add' }: FabButtonProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => { hapticLight(); onPress(); }}
      style={({ pressed }) => [styles.fab, { bottom: bottom + FAB_BOTTOM_OFFSET }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="add" size={28} color={colors.background} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position:        'absolute',
    right:           spacing[5],
    width:           56,
    height:          56,
    borderRadius:    radius.full,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     colors.primary,
    shadowOpacity:   0.35,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 6 },
    elevation:       8,
  },
  pressed: {
    opacity:   0.88,
    transform: [{ scale: 0.94 }],
  },
});
