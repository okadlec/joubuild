import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type PhotoUpdate = Database['public']['Tables']['photos']['Update'];

export function getProjectPhotos(
  client: TypedSupabaseClient,
  projectId: string,
  filters?: {
    task_id?: string;
    sheet_id?: string;
  }
) {
  let query = client
    .from('photos')
    .select('*')
    .eq('project_id', projectId);

  if (filters?.task_id) query = query.eq('task_id', filters.task_id);
  if (filters?.sheet_id) query = query.eq('sheet_id', filters.sheet_id);

  return query.order('created_at', { ascending: false });
}

export function updatePhoto(
  client: TypedSupabaseClient,
  id: string,
  data: PhotoUpdate
) {
  return client.from('photos').update(data).eq('id', id).select().single();
}

export function deletePhoto(client: TypedSupabaseClient, id: string) {
  return client.from('photos').delete().eq('id', id);
}
