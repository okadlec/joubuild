import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/format';
import { useProject } from '@/hooks/use-project';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { project, loading } = useProject(id!);

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-400">{t('project.notFound')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/(app)/project/${id}/edit` as any)}
              className="mr-2"
            >
              <Ionicons name="pencil" size={20} color="#3B82F6" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-neutral-950">
        {project.cover_image_url && (
          <Image
            source={{ uri: project.cover_image_url }}
            className="w-full h-48"
            resizeMode="cover"
          />
        )}

        <View className="px-4 pt-4">
          <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
            <Text className="text-white text-xl font-bold mb-1">{project.name}</Text>
            <Text className="text-neutral-400 text-sm capitalize">{project.status}</Text>
          </View>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/plans` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-blue-500/20 items-center justify-center mr-3">
              <Ionicons name="map-outline" size={22} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('plans.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('plans.openViewer')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/tasks` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-purple-500/20 items-center justify-center mr-3">
              <Ionicons name="checkbox-outline" size={22} color="#8B5CF6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('tasks.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('tasks.openTasks')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/documents` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-amber-500/20 items-center justify-center mr-3">
              <Ionicons name="folder-outline" size={22} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('documents.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('documents.openDocuments')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/photos` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-pink-500/20 items-center justify-center mr-3">
              <Ionicons name="images-outline" size={22} color="#EC4899" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('photos.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('photos.openPhotos')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/forms` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-cyan-500/20 items-center justify-center mr-3">
              <Ionicons name="document-text-outline" size={22} color="#06B6D4" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('forms.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('forms.openForms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/specifications` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-orange-500/20 items-center justify-center mr-3">
              <Ionicons name="document-outline" size={22} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('specifications.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('specifications.openSpecs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/reports` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-teal-500/20 items-center justify-center mr-3">
              <Ionicons name="analytics-outline" size={22} color="#14B8A6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('reports.title')}</Text>
              <Text className="text-neutral-400 text-sm">{t('reports.openReports')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 flex-row items-center"
            onPress={() => router.push(`/(app)/project/${id}/members` as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-lg bg-green-500/20 items-center justify-center mr-3">
              <Ionicons name="people-outline" size={22} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('members.title')}</Text>
              <Text className="text-neutral-400 text-sm">
                {project.project_members?.length ?? 0} {t('members.title').toLowerCase()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>

          {project.description && (
            <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
              <Text className="text-neutral-400 text-xs uppercase mb-2">{t('project.description')}</Text>
              <Text className="text-neutral-200">{project.description}</Text>
            </View>
          )}

          {project.address && (
            <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
              <Text className="text-neutral-400 text-xs uppercase mb-2">{t('project.address')}</Text>
              <Text className="text-neutral-200">{project.address}</Text>
            </View>
          )}

          <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
            <Text className="text-neutral-400 text-xs uppercase mb-2">{t('project.lastUpdated')}</Text>
            <Text className="text-neutral-200">{formatDate(project.updated_at)}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
