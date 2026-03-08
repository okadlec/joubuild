import type { TypedSupabaseClient } from '../client';

export function getExports(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('exports')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
}

export function requestExport(
  client: TypedSupabaseClient,
  data: {
    project_id: string;
    type: string;
    config?: Record<string, unknown>;
    requested_by: string | null;
  }
) {
  return client
    .from('exports')
    .insert({ ...data, status: 'pending' })
    .select()
    .single();
}

export function getReportSchedules(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('report_schedules')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
}
