import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/use-notifications';
import { formatRelativeTime } from '@joubuild/shared';

const NOTIFICATION_ICONS: Record<string, string> = {
  mention: 'at-outline',
  task_assigned: 'person-outline',
  status_changed: 'swap-horizontal-outline',
  comment_added: 'chatbubble-outline',
  due_date_approaching: 'alarm-outline',
  photo_added: 'image-outline',
  checklist_updated: 'checkbox-outline',
  task_updated: 'create-outline',
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const {
    notifications,
    loading,
    refreshing,
    onRefresh,
    markRead,
    markAllRead,
  } = useNotifications();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('notifications.title'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
          headerRight: () =>
            notifications.some((n) => !n.is_read) ? (
              <TouchableOpacity onPress={markAllRead}>
                <Text className="text-blue-500 text-sm font-medium">
                  {t('notifications.markAllRead')}
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View className="flex-1 bg-neutral-950">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="notifications-off-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">
              {t('notifications.noNotifications')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
            renderItem={({ item }) => {
              const iconName = NOTIFICATION_ICONS[item.type] ?? 'notifications-outline';
              return (
                <TouchableOpacity
                  className="flex-row items-start px-4 py-3 border-b border-neutral-800"
                  style={{
                    backgroundColor: item.is_read ? 'transparent' : '#1e293b',
                  }}
                  onPress={() => !item.is_read && markRead(item.id)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-neutral-800 items-center justify-center mr-3 mt-0.5">
                    <Ionicons
                      name={iconName as any}
                      size={20}
                      color={item.is_read ? '#737373' : '#3B82F6'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: item.is_read ? '#a3a3a3' : '#fff' }}
                    >
                      {item.title}
                    </Text>
                    {item.body && (
                      <Text
                        className="text-sm mt-0.5"
                        style={{ color: item.is_read ? '#737373' : '#a3a3a3' }}
                        numberOfLines={2}
                      >
                        {item.body}
                      </Text>
                    )}
                    <Text className="text-neutral-500 text-xs mt-1">
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                  {!item.is_read && (
                    <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </>
  );
}
