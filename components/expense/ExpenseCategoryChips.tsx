import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../ui/Chip';
import { type Category } from '../../lib/expenseCategories';
import { colors } from '../../theme/colors';

type Props = {
  chips: Category[];
  selected: string | null;
  bucketColor: string;
  bucketSoft: string;
  onSelectCategory: (cat: Category) => void;
  onClearCategory: () => void;
};

export function ExpenseCategoryChips({
  chips,
  selected,
  bucketColor,
  bucketSoft,
  onSelectCategory,
  onClearCategory,
}: Props) {
  return (
    <View style={styles.chipsSection}>
      <Text style={styles.sectionCap}>Category <Text style={styles.optional}>(optional)</Text></Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map(cat => {
          const isActive = selected === cat.label;
          return (
            <Chip
              key={cat.label}
              label={cat.label}
              emoji={cat.emoji}
              active={isActive}
              activeColor={bucketColor}
              activeBgColor={bucketSoft}
              onPress={() => isActive ? onClearCategory() : onSelectCategory(cat)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsSection: {
    marginBottom: 24,
  },
  sectionCap: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 10,
  },
  optional: {
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 10,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 20,
  },
});
