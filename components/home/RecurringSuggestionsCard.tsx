import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Eyebrow } from '../ui/Typography';
import { type RecurringExpense } from '../../db/recurring';
import { type SupportedCurrency } from '../../db/settings';
import { formatCentsToMoney } from '../../lib/money';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/tokens';

type Props = {
  items: RecurringExpense[];
  currency: SupportedCurrency;
  onAdd: (item: RecurringExpense) => void;
  onManage: () => void;
};

export function RecurringSuggestionsCard({ items, currency, onAdd, onManage }: Props) {
  return (
    <View style={styles.recurringCard}>
      <View style={styles.recurringHeader}>
        <Eyebrow color={colors.textTertiary}>RECURRING</Eyebrow>
        <Pressable
          onPress={onManage}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Manage recurring expenses"
        >
          <Eyebrow color={colors.primary}>Manage</Eyebrow>
        </Pressable>
      </View>
      {items.map((item, idx) => {
        const bucketColor = item.bucket === 'must' ? colors.must : colors.want;
        return (
          <View
            key={item.id}
            style={[styles.recurringRow, idx > 0 && styles.recurringRowBorder]}
          >
            <View style={[styles.recurringDot, { backgroundColor: bucketColor }]} />
            <View style={styles.recurringInfo}>
              <Text style={styles.recurringTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.recurringMeta}>
                {formatCentsToMoney(item.amount_cents, currency)}
                {' · Day '}{item.day_of_month}
              </Text>
            </View>
            <Pressable
              onPress={() => onAdd(item)}
              style={({ pressed }) => [styles.recurringAddBtn, pressed && styles.recurringAddBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.title}`}
            >
              <Text style={styles.recurringAddBtnText}>Add</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  recurringCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: 11,
  },
  recurringRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recurringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  recurringInfo: { flex: 1 },
  recurringTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  recurringMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  recurringAddBtn: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  recurringAddBtnPressed: { opacity: 0.6 },
  recurringAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
