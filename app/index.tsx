import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { AppScreen } from '../components/AppScreen';
import { useSettingsDb } from '../db/settings';
import { colors } from '../theme/colors';

export default function IndexScreen() {
  const { getBootState } = useSettingsDb();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const state = await getBootState();

      if (!mounted) return;

      if (!state.onboardingCompleted) {
        setTarget('/onboarding');
        return;
      }

      if (!state.hasActiveMonth) {
        setTarget('/month-setup');
        return;
      }

      setTarget('/(tabs)/home');
    }

    load();

    return () => {
      mounted = false;
    };
  }, [getBootState]);

  if (!target) {
    return (
      <AppScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </AppScreen>
    );
  }

  return <Redirect href={target as any} />;
}