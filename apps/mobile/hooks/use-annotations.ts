import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAnnotations } from '@joubuild/supabase';

export function useAnnotations(sheetVersionId: string | null) {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!sheetVersionId) {
      setAnnotations([]);
      setLoading(false);
      return;
    }
    const { data } = await getAnnotations(supabase, sheetVersionId);
    setAnnotations(data ?? []);
    setLoading(false);
  }, [sheetVersionId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { annotations, loading, refetch: fetch };
}
