import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getExports, requestExport } from '@joubuild/supabase';
import { useAuth } from '@/providers/auth-provider';
import { formatDate } from '@/lib/format';
import type { Export } from '@joubuild/shared';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444',
};

export default function ReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [exports, setExports] = useState<Export[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const fetchData = useCallback(async () => {
    const { data, error } = await getExports(supabase, id!);
    if (error) console.error('exports error:', error);
    setExports((data as Export[]) ?? []);
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

  const handleRequestExport = async (type: string) => {
    setRequesting(true);
    try {
      await requestExport(supabase, {
        project_id: id!,
        type,
        requested_by: user?.id ?? null,
      });
      fetchData();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setRequesting(false);
    }
  };

  const showExportMenu = () => {
    Alert.alert(t('reports.newExport'), undefined, [
      {
        text: t('reports.tasksCsv'),
        onPress: () => handleRequestExport('tasks_csv'),
      },
      {
        text: t('reports.photosExport'),
        onPress: () => handleRequestExport('photos'),
      },
      {
        text: t('reports.report'),
        onPress: () => handleRequestExport('report'),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('reports.title'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-neutral-950">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : exports.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="analytics-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">
              {t('reports.noExports')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={exports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
            renderItem={({ item }) => {
              const statusColor = STATUS_COLORS[item.status] ?? '#6B7280';
              return (
                <TouchableOpacity
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center"
                  disabled={item.status !== 'completed' || !item.file_url}
                  onPress={() => item.file_url && Linking.openURL(item.file_url)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-lg bg-teal-500/20 items-center justify-center mr-3">
                    <Ionicons name="download-outline" size={22} color="#14B8A6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium capitalize">
                      {item.type.replace('_', ' ')}
                    </Text>
                    <Text className="text-neutral-400 text-xs mt-0.5">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                  <View
                    className="rounded-md px-2 py-0.5"
                    style={{ backgroundColor: statusColor + '20' }}
                  >
                    <Text
                      style={{ color: statusColor }}
                      className="text-xs font-medium capitalize"
                    >
                      {item.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 items-center justify-center"
          style={{
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={showExportMenu}
          disabled={requesting}
        >
          <Ionicons
            name={requesting ? 'hourglass' : 'add'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
