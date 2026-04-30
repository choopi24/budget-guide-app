import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../AppScreen';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/tokens';

type Props = { onSetUp: () => void };

export function HomeEmptyState({ onSetUp }: Props) {
  return (
    <AppScreen scroll>
      <View style={styles.emptyWrap}>
        <Card variant="elevated">
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No active month</Text>
          <Text style={styles.emptyBody}>
            Set up this month to unlock your budget dashboard and start tracking.
          </Text>
          <Button
            label="Set up this month"
            onPress={onSetUp}
            style={{ marginTop: spacing[6] }}
          />
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing[10],
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    alignSelf: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
