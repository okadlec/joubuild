import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getProject } from '@joubuild/supabase';

export function useProject(id: string) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data, error } = await getProject(supabase, id);
    if (error) console.error('useProject error:', error);
    setProject(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { project, loading, refresh };
}
