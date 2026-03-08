import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAnnotationDetail } from '@/hooks/use-annotation-detail';
import { AnnotationDetail } from '@/components/plans/annotation-detail';

export default function AnnotationDetailScreen() {
  const { id, sheetId, annotationId } = useLocalSearchParams<{
    id: string;
    sheetId: string;
    annotationId: string;
  }>();
  const { t } = useTranslation();

  const [annotation, setAnnotation] = useState<any>(null);
  const [loadingAnnotation, setLoadingAnnotation] = useState(true);

  const { photos, comments, tasks, loading, refetch } =
    useAnnotationDetail(annotationId!);

  useEffect(() => {
    if (!annotationId) return;
    supabase
      .from('annotations')
      .select('*')
      .eq('id', annotationId)
      .single()
      .then(({ data }) => {
        setAnnotation(data);
        setLoadingAnnotation(false);
      });
  }, [annotationId]);

  if (loadingAnnotation || loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('plans.annotations'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <AnnotationDetail
        annotation={annotation}
        photos={photos}
        tasks={tasks}
        comments={comments}
        projectId={id!}
        sheetId={sheetId!}
        onRefresh={refetch}
      />
    </>
  );
}
