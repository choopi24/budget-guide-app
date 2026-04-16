import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../theme/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focusedName,
  color,
  size,
  focused,
}: {
  name: IoniconsName;
  focusedName: IoniconsName;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 46,
        height: 30,
        borderRadius: 15,
        backgroundColor: focused ? colors.primary + '14' : 'transparent',
      }}
    >
      <Ionicons name={focused ? focusedName : name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -2 },
          elevation: 10,
          height: 82,
          paddingTop: 8,
          paddingBottom: 14,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      {/* 1 — Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home-outline" focusedName="home" color={color} size={size} focused={focused} />
          ),
        }}
      />

      {/* 2 — History */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="receipt-outline" focusedName="receipt" color={color} size={size} focused={focused} />
          ),
        }}
      />

      {/* 3 — Invest */}
      <Tabs.Screen
        name="savings"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="stats-chart-outline" focusedName="stats-chart" color={color} size={size} focused={focused} />
          ),
        }}
      />

      {/* 4 — Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person-circle-outline" focusedName="person-circle" color={color} size={size} focused={focused} />
          ),
        }}
      />

      {/* 5 — Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="settings-outline" focusedName="settings" color={color} size={size} focused={focused} />
          ),
        }}
      />

      {/* Tips — hidden from tab bar, route still accessible */}
      <Tabs.Screen
        name="tips"
        options={{
          title: 'Tips',
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="bulb-outline" focusedName="bulb" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
