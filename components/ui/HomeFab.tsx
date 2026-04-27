import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../../lib/haptics';
import { colors } from '../../theme/colors';
import { FAB_BOTTOM_OFFSET, radius } from '../../theme/tokens';

type HomeFabProps = {
  onAdd:  () => void;
  onScan: () => void;
};

/**
 * Floating action cluster for the Home screen.
 *
 * Scan (secondary) — ink pill that visually belongs to the tab bar family.
 * Add  (primary)   — mint CTA, taller, dominant.
 *
 * Both sit above the floating tab bar via FAB_BOTTOM_OFFSET.
 */
export function HomeFab({ onAdd, onScan }: HomeFabProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      style={[styles.cluster, { bottom: bottom + FAB_BOTTOM_OFFSET }]}
      pointerEvents="box-none"
    >
      {/* ── Scan — ink family, mint icon ── */}
      <Pressable
        onPress={() => { hapticLight(); onScan(); }}
        style={({ pressed }) => [styles.scanBtn, pressed && styles.scanPressed]}
        accessibilityRole="button"
        accessibilityLabel="Scan receipt"
        pointerEvents="auto"
      >
        <Ionicons name="scan-outline" size={20} color={colors.primary} />
      </Pressable>

      {/* ── Add — mint primary CTA ── */}
      <Pressable
        onPress={() => { hapticLight(); onAdd(); }}
        style={({ pressed }) => [styles.addBtn, pressed && styles.addPressed]}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        pointerEvents="auto"
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    position:       'absolute',
    left:           0,
    right:          0,
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'flex-end',
    gap:            10,
  },

  // ── Scan button — mirrors the ink tab pill ────────────────────────────────
  scanBtn: {
    width:           44,
    height:          44,
    borderRadius:    radius.full,
    backgroundColor: colors.ink,
    borderWidth:     1,
    borderColor:     colors.inkBorder,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOpacity:   0.28,
    shadowRadius:    14,
    shadowOffset:    { width: 0, height: 5 },
    elevation:       8,
  },
  scanPressed: {
    opacity:   0.72,
    transform: [{ scale: 0.93 }],
  },

  // ── Add button — mint primary CTA ─────────────────────────────────────────
  addBtn: {
    width:           56,
    height:          56,
    borderRadius:    radius.full,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    // Subtle warm shadow — colored glow at 0.40 looks garish on light backgrounds
    shadowColor:     '#000',
    shadowOpacity:   0.20,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 6 },
    elevation:       10,
  },
  addPressed: {
    opacity:   0.88,
    transform: [{ scale: 0.94 }],
  },
});
