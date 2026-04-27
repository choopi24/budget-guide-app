import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface AppLogoProps {
  size?: number;
  showName?: boolean;
  streakCount?: number;
}

/**
 * The BudgetBull app logo — a business bull head in a circular badge.
 * Used on the profile page, streak card, and splash context.
 */
export function AppLogo({ size = 80, showName = false, streakCount }: AppLogoProps) {
  const r = size / 2;

  // The inner SVG renders a business bull head only (no body),
  // scaled to fit in a circle of diameter `size`.
  // Bull head coordinates assume a 100×100 inner canvas.
  const innerSize = size * 0.82;

  return (
    <View style={styles.wrapper}>
      {/* Badge circle */}
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: r,
            backgroundColor: '#C0392B',
            borderColor: '#922B21',
          },
        ]}
      >
        <BullHeadSvg size={innerSize} />
      </View>

      {/* Streak flame overlay */}
      {streakCount !== undefined && streakCount > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakNum}>{streakCount}</Text>
        </View>
      )}

      {showName && (
        <Text style={[styles.appName, { fontSize: size * 0.18 }]}>BudgetBull</Text>
      )}
    </View>
  );
}

// ─── Bull Head SVG (red + white silhouette + gold nose ring) ────────────────
function BullHeadSvg({ size }: { size: number }) {
  const h = size * (100 / 90);

  return (
    <Svg width={size} height={h} viewBox="0 0 90 105">
      {/* Horns — white, curving upward */}
      <Path
        d="M 28 42 C 24 30 16 12 12 7 C 10 3 17 1 21 4 C 25 7 27 20 31 40 Z"
        fill="white"
      />
      <Path
        d="M 62 42 C 66 30 74 12 78 7 C 80 3 73 1 69 4 C 65 7 63 20 59 40 Z"
        fill="white"
      />

      {/* Ears */}
      <Circle cx={16} cy={56} r={10} fill="white" />
      <Circle cx={74} cy={56} r={10} fill="white" />
      {/* Inner ear — soft red tint */}
      <Ellipse cx={16} cy={56} rx={6} ry={6.5} fill="#E8A0A0" />
      <Ellipse cx={74} cy={56} rx={6} ry={6.5} fill="#E8A0A0" />

      {/* Head */}
      <Circle cx={45} cy={56} r={30} fill="white" />

      {/* Brow furrow — bold, serious */}
      <Path d="M 27 44 Q 33 41 38 44" stroke="#C0392B" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M 52 44 Q 57 41 63 44" stroke="#C0392B" strokeWidth={2.5} fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <Circle cx={34} cy={51} r={6} fill="#C0392B" />
      <Circle cx={56} cy={51} r={6} fill="#C0392B" />
      {/* Eye shine */}
      <Circle cx={36} cy={49} r={2} fill="white" opacity={0.75} />
      <Circle cx={58} cy={49} r={2} fill="white" opacity={0.75} />

      {/* Snout */}
      <Ellipse cx={45} cy={67} rx={16} ry={11} fill="#F2D5D5" />
      <Ellipse cx={39} cy={69} rx={3.5} ry={2.8} fill="#C0392B" opacity={0.55} />
      <Ellipse cx={51} cy={69} rx={3.5} ry={2.8} fill="#C0392B" opacity={0.55} />

      {/* Gold nose ring — bull meets money */}
      <Ellipse
        cx={45}
        cy={73}
        rx={8}
        ry={3.5}
        stroke="#F0C040"
        strokeWidth={3}
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  badge: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  streakFlame: {
    fontSize: 10,
  },
  streakNum: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
  appName: {
    marginTop: 6,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
});
