/**
 * Typed text components that map to the design token type scale.
 *
 * Each component:
 *  - Uses a fixed size + weight from theme/tokens
 *  - Defaults to a sensible color from the palette
 *  - Accepts a `color` override and a `style` escape-hatch
 *
 * Usage:
 *   <Title>Good morning</Title>
 *   <Body color={colors.textMuted}>Track a spend below.</Body>
 *   <Eyebrow>Essentials</Eyebrow>
 *   <Caption style={{ marginTop: 4 }}>Last updated just now</Caption>
 */

import { Text, TextProps } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { type as typeScale, tabularNums } from '../../theme/tokens';

type TypographyProps = TextProps & { color?: string };

function make(scale: object, defaultColor: string) {
  return function TypographyComponent({ color, style, ...props }: TypographyProps) {
    return (
      <Text
        style={[scale, { color: color ?? defaultColor }, style]}
        {...props}
      />
    );
  };
}

/** 34 / 700 — hero numbers, top-of-screen stats */
export const LargeTitle = make(typeScale.largeTitle, colors.text);

/** 28 / 700 — primary screen title */
export const Title = make(typeScale.title1, colors.text);

/** 22 / 700 — card / section title */
export const Title2 = make(typeScale.title2, colors.text);

/** 18 / 600 — sub-section heading */
export const Title3 = make(typeScale.title3, colors.text);

/** 16 / 600 — field label, list primary */
export const Headline = make(typeScale.headline, colors.text);

/** 16 / 400 — paragraph body */
export const Body = make(typeScale.body, colors.text);

/** 15 / 400 — secondary body, description */
export const Callout = make(typeScale.callout, colors.textMuted);

/** 14 / 500 — subheading, metadata */
export const Subhead = make(typeScale.subhead, colors.text);

/** 13 / 400 — footnote, supporting text */
export const Footnote = make(typeScale.footnote, colors.textMuted);

/** 12 / 400 — timestamps, hints */
export const Caption = make(typeScale.caption, colors.textTertiary);

/** 11 / 700 uppercase — section eyebrows, badge labels */
export const Eyebrow = make(typeScale.eyebrow, colors.textMuted);

/** 36 / 700 — hero numbers (portfolio value, "left to spend", income hero) */
export const HeroNumber = make(
  {
    fontFamily: fonts.bold,
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -1.4,
    lineHeight: 40,
    ...tabularNums,
  },
  colors.text,
);
