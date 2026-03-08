import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { createFormSubmission } from '@joubuild/supabase';
import { useFormSubmissions } from '@/hooks/use-forms';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/providers/auth-provider';
import { formatDate } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  submitted: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
};

export default function FormSubmissionsScreen() {
  const { id, templateId } = useLocalSearchParams<{
    id: string;
    templateId: string;
  }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(id!);
  const canCreate = hasPermission('forms', 'can_create');
  const { submissions, loading, refreshing, onRefresh, refetch } =
    useFormSubmissions(templateId!);
  const [creating, setCreating] = useState(false);

  const handleNewSubmission = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { data, error } = await createFormSubmission(supabase, {
        template_id: templateId!,
        project_id: id!,
        data: {},
        status: 'draft',
        submitted_by: user?.id ?? null,
      });
      if (error) throw error;
      refetch();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('forms.submissions') }} />
      <View className="flex-1 bg-neutral-950">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : submissions.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="documents-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">
              {t('forms.noSubmissions')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={submissions}
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
                <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3">
                  <View className="flex-row items-center justify-between">
                    <View
                      className="rounded-md px-2 py-0.5"
                      style={{ backgroundColor: statusColor + '20' }}
                    >
                      <Text
                        style={{ color: statusColor }}
                        className="text-xs font-medium capitalize"
                      >
                        {t(`forms.status.${item.status}`)}
                      </Text>
                    </View>
                    <Text className="text-neutral-500 text-xs">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {canCreate && (
          <TouchableOpacity
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 items-center justify-center"
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={handleNewSubmission}
            disabled={creating}
          >
            <Ionicons
              name={creating ? 'hourglass' : 'add'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
