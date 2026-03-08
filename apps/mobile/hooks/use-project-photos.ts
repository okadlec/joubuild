import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getProjectPhotos } from '@joubuild/supabase';
import type { Photo } from '@joubuild/shared';

export function useProjectPhotos(projectId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setPhotos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error } = await getProjectPhotos(supabase, projectId);
    if (error) console.error('useProjectPhotos error:', error);
    setPhotos((data as Photo[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return { photos, loading, refreshing, onRefresh, refetch: fetchData };
}
