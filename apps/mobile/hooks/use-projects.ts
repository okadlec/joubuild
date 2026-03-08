import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getProjects } from '@joubuild/supabase';
import { useOrg } from '@/providers/org-provider';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  address: string | null;
  cover_image_url: string | null;
  updated_at: string;
}

export function useProjects() {
  const { currentOrgId } = useOrg();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrgId) {
      setProjects([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error } = await getProjects(supabase, currentOrgId);
    if (error) console.error('useProjects error:', error);
    setProjects((data as any[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [currentOrgId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return { projects, loading, refreshing, onRefresh };
}
