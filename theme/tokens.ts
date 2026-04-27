import { Easing } from 'react-native';

/** Shared easing for all Animated.timing calls and press scale transitions. */
export const springEasing = Easing.bezier(0.32, 0.72, 0, 1);

// ── Floating tab bar + FAB layout constants ───────────────────────────────────
export const TAB_BAR_PILL_HEIGHT   = 64;
export const TAB_BAR_MARGIN_BOTTOM = 8;
/** Bottom offset (above safeArea) for FABs sitting above the floating tab bar. */
export const FAB_BOTTOM_OFFSET = TAB_BAR_PILL_HEIGHT + TAB_BAR_MARGIN_BOTTOM + 16;

// ── Spacing (4-point grid) ────────────────────────────────────────────────────
export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 999,
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
// Warm-tinted shadow color so they read naturally on the paper background.
// Opacities are slightly higher than a dark-mode app — needed for visibility.
export const shadows = {
  sm: {
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  md: {
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#3D2B1A',
    shadowOpacity: 0.13,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

// ── Tabular numbers ───────────────────────────────────────────────────────────
// Spread into any Text style that displays money or numeric values to prevent
// digit-width layout shifts as values change.
// e.g. StyleSheet.create({ amount: { ...tabularNums, fontSize: 32, ... } })
export const tabularNums = {
  fontVariant: ['tabular-nums'] as const,
} as const;

// ── Typography scale (Apple HIG–inspired) ────────────────────────────────────
export const type = {
  /** 34 / 700 — hero numbers, top-of-screen stat displays */
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  /** 28 / 700 — primary screen title */
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  /** 22 / 700 — card / section title */
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  /** 18 / 600 — sub-section title */
  title3: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  /** 16 / 600 — label, field name, list item primary */
  headline: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  /** 16 / 400 — paragraph body */
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  /** 15 / 400 — secondary body, list item secondary */
  callout: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  /** 14 / 500 — subheading, metadata */
  subhead: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  /** 13 / 400 — small supporting text */
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  /** 12 / 400 — timestamps, hints, secondary metadata */
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  /** 11 / 700 uppercase — section eyebrows, badge labels */
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.0,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;
