import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/ui/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* ── 4 visible tabs ────────────────────────────────────────────────── */}
      <Tabs.Screen name="home"    options={{ title: 'Home'    }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="savings" options={{ title: 'Invest'  }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

      {/* ── Auxiliary screens — not shown in the tab bar ──────────────────── */}
      <Tabs.Screen name="tips" options={{ title: 'Tips', tabBarButton: () => null }} />
    </Tabs>
  );
}
