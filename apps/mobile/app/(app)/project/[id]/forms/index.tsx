import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFormTemplates } from '@/hooks/use-forms';
import { FORM_TYPE_LABELS } from '@joubuild/shared';
import { formatDate } from '@/lib/format';

export default function FormsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { templates, loading, refreshing, onRefresh } = useFormTemplates(id!);

  return (
    <>
      <Stack.Screen options={{ title: t('forms.title') }} />
      <View className="flex-1 bg-neutral-950">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : templates.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="document-text-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">{t('forms.noForms')}</Text>
          </View>
        ) : (
          <FlatList
            data={templates}
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
              <TouchableOpacity
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center"
                onPress={() =>
                  router.push(
                    `/(app)/project/${id}/forms/${item.id}` as any
                  )
                }
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-lg bg-cyan-500/20 items-center justify-center mr-3">
                  <Ionicons name="document-text-outline" size={22} color="#06B6D4" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{item.name}</Text>
                  <Text className="text-neutral-400 text-sm">
                    {FORM_TYPE_LABELS[item.type] ?? item.type}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#525252" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </>
  );
}
