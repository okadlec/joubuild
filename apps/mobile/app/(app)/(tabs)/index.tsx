import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/format';
import { useProjects } from '@/hooks/use-projects';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400' },
  archived: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  completed: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { projects, loading, refreshing, onRefresh } = useProjects();

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-950">
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-neutral-400 text-base">{t('projects.noProjects')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const style = STATUS_STYLES[item.status] ?? { bg: 'bg-neutral-700', text: 'text-neutral-300' };
          const statusKey = `projects.status.${item.status}` as const;
          return (
            <TouchableOpacity
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-3"
              onPress={() => router.push(`/(app)/project/${item.id}` as any)}
              activeOpacity={0.7}
            >
              {item.cover_image_url && (
                <Image
                  source={{ uri: item.cover_image_url }}
                  className="w-full h-36"
                  resizeMode="cover"
                />
              )}
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-semibold text-base flex-1 mr-2">
                    {item.name}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-full ${style.bg}`}>
                    <Text className={`text-xs font-medium ${style.text}`}>
                      {t(statusKey, { defaultValue: item.status })}
                    </Text>
                  </View>
                </View>
                {item.description && (
                  <Text className="text-neutral-400 text-sm mb-2" numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <View className="flex-row items-center justify-between">
                  {item.address && (
                    <Text className="text-neutral-500 text-xs flex-1" numberOfLines={1}>
                      {item.address}
                    </Text>
                  )}
                  <Text className="text-neutral-500 text-xs">
                    {formatDate(item.updated_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        className="absolute bottom-6 right-4 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/(app)/project/create' as any)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
