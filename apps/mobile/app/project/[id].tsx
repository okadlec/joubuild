import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProject } from '@joubuild/supabase';
import { formatDate } from '@joubuild/shared';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getProject(supabase, id).then(({ data }) => {
      setProject(data);
      setLoading(false);
    });
  }, [id]);

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
        <Text className="text-neutral-400">Project not found</Text>
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
        }}
      />
      <ScrollView className="flex-1 bg-neutral-950 px-4 pt-4">
        <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <Text className="text-white text-xl font-bold mb-1">{project.name}</Text>
          <Text className="text-neutral-400 text-sm capitalize">{project.status}</Text>
        </View>

        {project.description && (
          <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
            <Text className="text-neutral-400 text-xs uppercase mb-2">Description</Text>
            <Text className="text-neutral-200">{project.description}</Text>
          </View>
        )}

        {project.address && (
          <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
            <Text className="text-neutral-400 text-xs uppercase mb-2">Address</Text>
            <Text className="text-neutral-200">{project.address}</Text>
          </View>
        )}

        <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <Text className="text-neutral-400 text-xs uppercase mb-2">Last Updated</Text>
          <Text className="text-neutral-200">{formatDate(project.updated_at)}</Text>
        </View>
      </ScrollView>
    </>
  );
}
