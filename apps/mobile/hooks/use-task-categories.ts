import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTaskCategories } from '@joubuild/supabase';
import type { TaskCategory } from '@joubuild/shared';

export function useTaskCategories(projectId: string) {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    const { data, error } = await getTaskCategories(supabase, projectId);
    if (error) console.error('useTaskCategories error:', error);
    setCategories((data as TaskCategory[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { categories, loading, refetch: fetchData };
}
