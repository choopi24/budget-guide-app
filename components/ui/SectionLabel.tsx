import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { type as typeScale } from '../../theme/tokens';

type SectionLabelProps = {
  children: string;
  style?: TextStyle;
};

/**
 * Uppercase eyebrow / section label.
 * Consistent 11px bold tracking across all screens.
 *
 * Usage:
 *   <SectionLabel>Month setup</SectionLabel>
 *   <SectionLabel style={{ marginBottom: 12 }}>History</SectionLabel>
 */
export function SectionLabel({ children, style }: SectionLabelProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...typeScale.eyebrow,
    color: colors.textTertiary,
  },
});
