import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Defs, RadialGradient, Stop, G } from 'react-native-svg';
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
            backgroundColor: colors.surfaceSoft,
            borderColor: colors.primary + '40',
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

// ─── Bull Head SVG (logo quality) ───────────────────────────────────────────
function BullHeadSvg({ size }: { size: number }) {
  const h = size * (100 / 90); // maintain head proportion

  return (
    <Svg width={size} height={h} viewBox="0 0 90 105">
      {/* Horns */}
      <Path
        d="M 28 40 L 14 10 Q 12 4 20 3 Q 28 4 28 14 L 32 40 Z"
        fill="#6B4226"
      />
      <Path
        d="M 62 40 L 76 10 Q 78 4 70 3 Q 62 4 62 14 L 58 40 Z"
        fill="#6B4226"
      />

      {/* Ears */}
      <Circle cx={15} cy={54} r={11} fill="#9C6F47" />
      <Circle cx={75} cy={54} r={11} fill="#9C6F47" />
      <Ellipse cx={15} cy={54} rx={6.5} ry={7} fill="#D4A070" />
      <Ellipse cx={75} cy={54} rx={6.5} ry={7} fill="#D4A070" />

      {/* Head */}
      <Circle cx={45} cy={56} r={30} fill="#9C6F47" />

      {/* Shirt collar visible at bottom */}
      <Path d="M 20 83 Q 30 78 45 78 Q 60 78 70 83 L 70 95 L 20 95 Z" fill="#F4F6F8" />
      <Path d="M 20 83 Q 28 78 38 82 L 32 95 L 14 95 Z" fill="#1A2535" />
      <Path d="M 70 83 Q 62 78 52 82 L 58 95 L 76 95 Z" fill="#1A2535" />
      {/* Tie */}
      <Path d="M 41 80 L 49 80 L 47 87 L 45 89 L 43 87 Z" fill="#1E5C3E" />
      <Path d="M 43 87 L 45 89 L 47 87 L 49 97 L 45 100 L 41 97 Z" fill="#2F7D57" />

      {/* Eyes */}
      <Circle cx={34} cy={51} r={8} fill="white" />
      <Circle cx={56} cy={51} r={8} fill="white" />
      <Circle cx={35} cy={52} r={5.5} fill="#2C1206" />
      <Circle cx={57} cy={52} r={5.5} fill="#2C1206" />
      <Circle cx={36} cy={53} r={2.8} fill="#0A0500" />
      <Circle cx={58} cy={53} r={2.8} fill="#0A0500" />
      <Circle cx={38} cy={50} r={1.6} fill="white" />
      <Circle cx={60} cy={50} r={1.6} fill="white" />

      {/* Snout */}
      <Ellipse cx={45} cy={67} rx={16} ry={11} fill="#B87A54" />
      <Ellipse cx={39} cy={69} rx={4} ry={3.2} fill="#5C2E10" />
      <Ellipse cx={51} cy={69} rx={4} ry={3.2} fill="#5C2E10" />

      {/* Smile */}
      <Path
        d="M 39 76 Q 45 80 51 76"
        stroke="#5C2E10"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />

      {/* Brow furrow — serious business look */}
      <Path d="M 27 44 Q 33 42 37 44" stroke="#6B4226" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M 53 44 Q 57 42 63 44" stroke="#6B4226" strokeWidth={2} fill="none" strokeLinecap="round" />
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
