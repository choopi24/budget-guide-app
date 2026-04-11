import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { colors } from '../../theme/colors';

export default function HistoryScreen() {
  return (
    <AppScreen scroll>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>History</Text>
        <Text style={styles.title}>Each month will stay saved here.</Text>
        <Text style={styles.body}>
          Later this will show previous months and rollover results.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    padding: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.want,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
});