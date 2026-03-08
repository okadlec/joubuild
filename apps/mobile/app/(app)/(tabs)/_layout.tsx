import { View, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OrgSwitcher } from '@/components/org-switcher';
import { NotificationBadge } from '@/components/notification-badge';
import { useNotifications } from '@/hooks/use-notifications';

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const NotificationBell = () => (
    <TouchableOpacity
      onPress={() => router.push('/(app)/notifications' as any)}
      className="mr-3"
    >
      <View>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
        <NotificationBadge count={unreadCount} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#737373',
        tabBarStyle: {
          backgroundColor: '#171717',
          borderTopColor: '#262626',
        },
        headerStyle: {
          backgroundColor: '#171717',
        },
        headerTintColor: '#fff',
        headerRight: () => <NotificationBell />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <OrgSwitcher />,
          tabBarLabel: t('tabs.projects'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
