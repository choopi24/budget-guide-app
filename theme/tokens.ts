/**
 * Design tokens — spacing, radii, shadows, typography scale.
 *
 * Import from here (or from theme/index) in all UI primitives and screens.
 * Screens can adopt these gradually; nothing is forced.
 */

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
// Use these objects spread into StyleSheet entries.
// e.g. StyleSheet.create({ card: { ...shadows.md, ... } })
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.11,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

// ── Typography scale (Apple HIG–inspired) ─────────────────────────────────────
// fontWeight must be typed as a string literal for RN compatibility.
export const type = {
  /** Hero numbers, top-of-screen stat displays */
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  /** Primary screen title */
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  /** Card / section title */
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  /** Sub-section title */
  title3: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  /** Label, field name, list item primary */
  headline: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  /** Paragraph body text */
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  /** Secondary body, list item secondary */
  callout: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  /** Subheading, metadata */
  subhead: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  /** Small supporting text */
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  /** Timestamps, hints, secondary metadata */
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  /** Section labels, badge text — always uppercase via component */
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.0,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;
