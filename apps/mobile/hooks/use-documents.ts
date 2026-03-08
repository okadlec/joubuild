import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDocuments } from '@joubuild/supabase';

export function useDocuments(projectId: string) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocs = useCallback(async () => {
    const { data, error } = await getDocuments(supabase, projectId);
    if (error) console.error('getDocuments error:', error);
    setDocuments(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocs();
  }, [fetchDocs]);

  // Derive unique folder paths
  const folders = [...new Set(documents.map((d) => d.folder_path as string))];

  return { documents, folders, loading, refreshing, onRefresh };
}
