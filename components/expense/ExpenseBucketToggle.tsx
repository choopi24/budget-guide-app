import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type ExpenseBucket } from '../../lib/expenseClassifier';
import { colors } from '../../theme/colors';

type Props = {
  bucket: ExpenseBucket;
  onChange: (b: ExpenseBucket) => void;
};

export function ExpenseBucketToggle({ bucket, onChange }: Props) {
  return (
    <View style={styles.bucketRow}>
      {(['must', 'want'] as ExpenseBucket[]).map(b => {
        const isActive = bucket === b;
        const bColor   = b === 'must' ? colors.must     : colors.want;
        const bSoft    = b === 'must' ? colors.mustSoft : colors.wantSoft;
        return (
          <Pressable
            key={b}
            onPress={() => onChange(b)}
            accessibilityRole="radio"
            accessibilityLabel={b === 'must' ? 'Must — essential expenses' : 'Want — discretionary spending'}
            accessibilityState={{ selected: isActive }}
            style={[
              styles.bucketBtn,
              isActive && { backgroundColor: bSoft, borderColor: bColor + '60' },
            ]}
          >
            <View style={[
              styles.bucketDot,
              { backgroundColor: bColor, opacity: isActive ? 1 : 0.35 },
            ]} />
            <Text style={[styles.bucketLabel, isActive && { color: bColor }]}>
              {b === 'must' ? 'Must' : 'Want'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bucketRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 32,
  },
  bucketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  bucketDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bucketLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: -0.1,
  },
});
