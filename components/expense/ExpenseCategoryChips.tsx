import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../ui/Chip';
import { type Category } from '../../lib/expenseCategories';
import { colors } from '../../theme/colors';

type Props = {
  chips: Category[];
  selected: string | null;
  isCustom: boolean;
  bucketColor: string;
  bucketSoft: string;
  onSelectCategory: (cat: Category) => void;
  onSelectCustom: () => void;
};

export function ExpenseCategoryChips({
  chips,
  selected,
  isCustom,
  bucketColor,
  bucketSoft,
  onSelectCategory,
  onSelectCustom,
}: Props) {
  return (
    <View style={styles.chipsSection}>
      <Text style={styles.sectionCap}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map(cat => (
          <Chip
            key={cat.label}
            label={cat.label}
            emoji={cat.emoji}
            active={selected === cat.label}
            activeColor={bucketColor}
            activeBgColor={bucketSoft}
            onPress={() => onSelectCategory(cat)}
          />
        ))}
        <Chip
          label="Custom"
          emoji="✏️"
          active={isCustom}
          activeColor={colors.primary}
          activeBgColor={colors.surfaceSoft}
          onPress={onSelectCustom}
          accessibilityLabel="Custom category"
        />
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
  chipsRow: {
    gap: 8,
    paddingRight: 20,
  },
});
