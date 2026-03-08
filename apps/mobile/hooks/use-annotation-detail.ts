import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getAnnotationPhotos,
  getAnnotationComments,
  getAnnotationTasks,
} from '@joubuild/supabase';

export function useAnnotationDetail(annotationId: string) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const [photosRes, commentsRes, tasksRes] = await Promise.all([
      getAnnotationPhotos(supabase, annotationId),
      getAnnotationComments(supabase, annotationId),
      getAnnotationTasks(supabase, annotationId),
    ]);
    setPhotos(photosRes.data ?? []);
    setComments(commentsRes.data ?? []);
    setTasks(tasksRes.data ?? []);
    setLoading(false);
  }, [annotationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { photos, comments, tasks, loading, refetch: fetch };
}
