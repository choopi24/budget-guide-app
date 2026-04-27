import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { hapticLight } from '../../lib/haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  radius,
  springEasing,
  TAB_BAR_MARGIN_BOTTOM,
  TAB_BAR_PILL_HEIGHT,
} from '../../theme/tokens';

// ── Visible routes ────────────────────────────────────────────────────────────

const VISIBLE = ['home', 'history', 'savings', 'profile'] as const;
type VisibleRoute = (typeof VISIBLE)[number];

const LABELS: Record<VisibleRoute, string> = {
  home:    'Home',
  history: 'History',
  savings: 'Invest',
  profile: 'Profile',
};

// ── Colors on the ink pill ─────────────────────────────────────────────────────
const ICON_ACTIVE   = colors.primary;                // mint — pops on dark
const ICON_INACTIVE = 'rgba(250,248,244,0.42)';      // warm white at low opacity
const LABEL_COLOR   = colors.primary;                // mint label matches active icon

// ── SVG icons (1.7px stroke) ──────────────────────────────────────────────────

const S = 1.7;

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3L21 9.5V21H15V15H9V21H3V9.5Z"
        stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function HistoryIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2"
        stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="8" y1="8"  x2="16" y2="8"  stroke={color} strokeWidth={S} strokeLinecap="round" />
      <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={S} strokeLinecap="round" />
      <Line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

function InvestIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth={S} strokeLinecap="round" />
      <Polyline points="4,20 4,14 8,14 8,20"   stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="10,20 10,9 14,9 14,20"  stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="16,20 16,4 20,4 20,20"  stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4"
        stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M5 21C5 17.134 8.134 14 12 14C15.866 14 19 17.134 19 21"
        stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

const ICONS: Record<VisibleRoute, React.ComponentType<{ color: string }>> = {
  home:    HomeIcon,
  history: HistoryIcon,
  savings: InvestIcon,
  profile: ProfileIcon,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Resolve active tab — settings maps to Profile so the pill stays anchored
  const rawName    = state.routes[state.index]?.name ?? '';
  const activeName: VisibleRoute | null = (VISIBLE as readonly string[]).includes(rawName)
    ? (rawName as VisibleRoute)
    : rawName === 'settings' ? 'profile' : null;

  const anims = useRef(
    Object.fromEntries(
      VISIBLE.map(name => [name, new Animated.Value(name === activeName ? 1 : 0)])
    ) as Record<VisibleRoute, Animated.Value>
  ).current;

  useEffect(() => {
    Animated.parallel(
      VISIBLE.map(name =>
        Animated.timing(anims[name], {
          toValue:         name === activeName ? 1 : 0,
          duration:        260,
          useNativeDriver: false,
          easing:          springEasing,
        })
      )
    ).start();
  }, [activeName]);

  const visibleRoutes = state.routes.filter(r =>
    (VISIBLE as readonly string[]).includes(r.name)
  );

  return (
    <View
      style={[styles.wrapper, { paddingBottom: insets.bottom + TAB_BAR_MARGIN_BOTTOM }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {visibleRoutes.map(route => {
          const name      = route.name as VisibleRoute;
          const isFocused = name === activeName;
          const anim      = anims[name];
          const Icon      = ICONS[name];

          // Soft mint wash grows in behind the active tab
          const tabHighlight = anim.interpolate({
            inputRange:  [0, 1],
            outputRange: ['rgba(0,180,138,0)', 'rgba(0,180,138,0.16)'],
          });
          // Label slides in horizontally — maxWidth drives the expand
          const labelMaxWidth = anim.interpolate({
            inputRange: [0, 1], outputRange: [0, 72],
          });
          const labelMarginLeft = anim.interpolate({
            inputRange: [0, 1], outputRange: [0, 8],
          });

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                hapticLight();
                const event = navigation.emit({
                  type:              'tabPress',
                  target:            route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate({ name: route.name, merge: true } as never);
                }
              }}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityLabel={LABELS[name]}
              accessibilityState={{ selected: isFocused }}
            >
              <Animated.View style={[styles.tabPill, { backgroundColor: tabHighlight }]}>
                <Icon color={isFocused ? ICON_ACTIVE : ICON_INACTIVE} />
                <Animated.View style={[styles.labelWrap, { maxWidth: labelMaxWidth, marginLeft: labelMarginLeft }]}>
                  <Animated.Text
                    style={[styles.label, { opacity: anim }]}
                    numberOfLines={1}
                  >
                    {LABELS[name]}
                  </Animated.Text>
                </Animated.View>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            TAB_BAR_PILL_HEIGHT,
    backgroundColor:   colors.ink,
    borderRadius:      radius['2xl'],
    borderWidth:       1,
    borderColor:       colors.inkBorder,
    paddingHorizontal: 6,
    // Strong shadow — ink pill on paper background needs lift
    shadowColor:       '#000',
    shadowOpacity:     0.28,
    shadowRadius:      24,
    shadowOffset:      { width: 0, height: 10 },
    elevation:         14,
  },
  tab: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    height:          '100%',
  },
  tabPill: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 12,
    paddingVertical:   9,
    borderRadius:      radius.xl,
    overflow:          'hidden',
  },
  labelWrap: {
    overflow: 'hidden',
  },
  label: {
    fontSize:      13,
    fontFamily:    fonts.semiBold,
    fontWeight:    '600',
    color:         LABEL_COLOR,
    letterSpacing: -0.2,
  },
});
