import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPlanSets } from '@joubuild/supabase';

export function usePlanSets(projectId: string) {
  const [planSets, setPlanSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    const { data, error } = await getPlanSets(supabase, projectId);
    if (error) console.error('getPlanSets error:', error);
    setPlanSets(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  return { planSets, loading, refreshing, onRefresh };
}
