import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { migrateDbIfNeeded } from '../db/migrations';
import { colors } from '../theme/colors';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="budget-guide.db"
      onInit={migrateDbIfNeeded}
      useSuspense={false}
    >
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="expense-new" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="expenses" options={{ headerShown: false }} />
        <Stack.Screen name="investment-new" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="investment-edit" options={{ headerShown: false }} />
        <Stack.Screen name="investment/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="investment-update-new" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="investment-purchase" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="investment-value-update" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-expense-from-shortcut" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="receipt-scan" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="receipt-review" options={{ headerShown: false }} />
        <Stack.Screen name="ai-budget-review" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="avatar-edit" options={{ headerShown: false }} />
      </Stack>
    </SQLiteProvider>
  );
}