import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/tokens';

export type CardVariant = 'elevated' | 'outlined' | 'flat';

type CardProps = {
  children: ReactNode;
  /** Visual treatment. Default: 'elevated' */
  variant?: CardVariant;
  /** Inner padding. Pass `false` to opt out entirely. Default: spacing[6] (24) */
  padding?: number | false;
  style?: ViewStyle;
};

/**
 * A consistent surface container.
 *
 *   elevated  — white background with a soft shadow (default)
 *   outlined  — white background with a 1px border, no shadow
 *   flat      — no border, no shadow; just the surface background
 *
 * Usage:
 *   <Card>…</Card>
 *   <Card variant="outlined" padding={spacing[4]}>…</Card>
 *   <Card padding={false} style={{ overflow: 'hidden' }}>…</Card>
 */
export function Card({
  children,
  variant = 'elevated',
  padding,
  style,
}: CardProps) {
  const pad = padding === false ? undefined : { padding: padding ?? spacing[6] };
  return (
    <View style={[styles.base, styles[variant], pad, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
  },
  elevated: {
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {},
});
