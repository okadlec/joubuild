import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getSpecifications, deleteSpecification } from '@joubuild/supabase';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate } from '@/lib/format';
import type { Specification } from '@joubuild/shared';

export default function SpecificationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions(id!);
  const canDelete = hasPermission('specifications', 'can_delete');

  const [specs, setSpecs] = useState<Specification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data, error } = await getSpecifications(supabase, id!);
    if (error) console.error('specifications error:', error);
    setSpecs((data as Specification[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleDelete = (specId: string) => {
    Alert.alert(t('specifications.deleteConfirmTitle'), t('specifications.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('specifications.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteSpecification(supabase, specId);
          fetchData();
        },
      },
    ]);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('specifications.title'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-neutral-950">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : specs.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="document-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">
              {t('specifications.noSpecifications')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={specs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
            renderItem={({ item }) => (
              <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-orange-500/20 items-center justify-center mr-3">
                  <Ionicons name="document-outline" size={22} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-neutral-400 text-xs mt-0.5">
                    {formatFileSize(item.file_size)}
                    {item.file_size ? ' · ' : ''}
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}
