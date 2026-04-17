import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  /** Node rendered before the label (icon, emoji, etc.) */
  leadingIcon?: ReactNode;
  /** Outer container style override */
  style?: ViewStyle;
};

const HEIGHT:     Record<ButtonSize, number> = { sm: 38, md: 48, lg: 54 };
const FONT_SIZE:  Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 };

/**
 * General-purpose button with four variants and three sizes.
 *
 *   primary   — solid green fill  (default, main CTA)
 *   secondary — outline, green border + text
 *   ghost     — no background or border, green text only
 *   danger    — solid red fill
 *
 * Usage:
 *   <Button label="Save" onPress={handleSave} />
 *   <Button label="Cancel" variant="ghost" size="md" onPress={router.back} />
 *   <Button label="Delete" variant="danger" disabled={saving} onPress={handleDelete} />
 */
export function Button({
  label,
  variant   = 'primary',
  size      = 'lg',
  loading   = false,
  fullWidth = true,
  disabled,
  leadingIcon,
  onPress,
  style: styleProp,
  ...rest
}: ButtonProps) {
  const isDisabled = !!(disabled || loading);

  function containerStyle({ pressed }: { pressed: boolean }) {
    const base: object[] = [
      styles.base,
      { height: HEIGHT[size] },
      fullWidth ? styles.fullWidth : styles.intrinsic,
    ];
    if (styleProp) base.push(styleProp);

    switch (variant) {
      case 'primary':
        base.push(styles.primary);
        if (isDisabled) base.push(styles.primaryDisabled);
        else if (pressed) base.push(styles.primaryPressed);
        break;
      case 'secondary':
        base.push(styles.secondary);
        if (isDisabled) base.push(styles.secondaryDisabled);
        else if (pressed) base.push(styles.secondaryPressed);
        break;
      case 'ghost':
        base.push(styles.ghost);
        if (pressed || isDisabled) base.push(styles.ghostPressed);
        break;
      case 'danger':
        base.push(styles.danger);
        if (isDisabled) base.push(styles.dangerDisabled);
        else if (pressed) base.push(styles.dangerPressed);
        break;
    }
    return base;
  }

  function labelColor(): string {
    if (isDisabled && (variant === 'secondary' || variant === 'ghost')) return colors.textMuted;
    switch (variant) {
      case 'secondary':
      case 'ghost':
        return colors.primary;
      default:
        return colors.white;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={containerStyle}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {leadingIcon}
          <Text style={[styles.label, { fontSize: FONT_SIZE[size], color: labelColor() }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  fullWidth:  { alignSelf: 'stretch' },
  intrinsic:  { alignSelf: 'flex-start' },

  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Primary ───────────────────────────────────────────────────────────────
  primary:         { backgroundColor: colors.primary },
  primaryPressed:  { opacity: 0.88 },
  primaryDisabled: { backgroundColor: colors.buttonDisabled },

  // ── Secondary ─────────────────────────────────────────────────────────────
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryPressed:  { opacity: 0.72 },
  secondaryDisabled: { borderColor: colors.buttonDisabled },

  // ── Ghost ─────────────────────────────────────────────────────────────────
  ghost:        { backgroundColor: 'transparent' },
  ghostPressed: { opacity: 0.55 },

  // ── Danger ────────────────────────────────────────────────────────────────
  danger:         { backgroundColor: colors.danger },
  dangerPressed:  { opacity: 0.88 },
  dangerDisabled: { opacity: 0.45 },
});
