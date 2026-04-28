import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/tokens';

export type CardVariant = 'elevated' | 'outlined' | 'flat' | 'hero';

type CardProps = {
  children: ReactNode;
  /** Visual treatment. Default: 'elevated' */
  variant?: CardVariant;
  /** Inner padding. Pass `false` to opt out entirely. Default: spacing[6] (24) */
  padding?: number | false;
  style?: ViewStyle;
};

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
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {},
  hero: {
    backgroundColor: colors.ink,
    borderWidth: 0,
    ...shadows.lg,
  },
});
