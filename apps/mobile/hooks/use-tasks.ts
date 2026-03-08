import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasks } from '@joubuild/supabase';
import type { Task } from '@joubuild/shared';

interface TaskFilters {
  status?: string;
  assignee_id?: string;
  category_id?: string;
}

export function useTasks(projectId: string, filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error } = await getTasks(supabase, projectId, filters);
    if (error) console.error('useTasks error:', error);
    setTasks((data as Task[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [projectId, filters?.status, filters?.assignee_id, filters?.category_id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return { tasks, loading, refreshing, onRefresh, refetch: fetchData };
}
