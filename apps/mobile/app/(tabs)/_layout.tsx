import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Výkresy',
          tabBarLabel: 'Výkresy',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Úkoly',
          tabBarLabel: 'Úkoly',
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: 'Fotky',
          tabBarLabel: 'Fotky',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Více',
          tabBarLabel: 'Více',
        }}
      />
    </Tabs>
  );
}
