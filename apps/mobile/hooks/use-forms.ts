import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getFormTemplates, getFormSubmissions } from '@joubuild/supabase';
import type { FormTemplate, FormSubmission } from '@joubuild/shared';

export function useFormTemplates(projectId: string) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setTemplates([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error } = await getFormTemplates(supabase, projectId);
    if (error) console.error('useFormTemplates error:', error);
    setTemplates((data as FormTemplate[]) ?? []);
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

  return { templates, loading, refreshing, onRefresh, refetch: fetchData };
}

export function useFormSubmissions(templateId: string) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!templateId) {
      setSubmissions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error } = await getFormSubmissions(supabase, templateId);
    if (error) console.error('useFormSubmissions error:', error);
    setSubmissions((data as FormSubmission[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [templateId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return { submissions, loading, refreshing, onRefresh, refetch: fetchData };
}
