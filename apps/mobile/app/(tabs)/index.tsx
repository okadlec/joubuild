import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { formatDate } from '@joubuild/shared';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  address: string | null;
  updated_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400' },
  planning: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  completed: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  on_hold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
};

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) setProjects(data);
  }, []);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

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
            <Text className="text-neutral-400 text-base">No projects yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const style = STATUS_STYLES[item.status] ?? { bg: 'bg-neutral-700', text: 'text-neutral-300' };
          return (
            <TouchableOpacity
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3"
              onPress={() => router.push(`/project/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-semibold text-base flex-1 mr-2">
                  {item.name}
                </Text>
                <View className={`px-2 py-0.5 rounded-full ${style.bg}`}>
                  <Text className={`text-xs font-medium ${style.text}`}>
                    {item.status}
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
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
