import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type AnnotationInsert = Database['public']['Tables']['annotations']['Insert'];
type PhotoInsert = Database['public']['Tables']['photos']['Insert'];

export function getPlanSets(client: TypedSupabaseClient, projectId: string) {
  return client
    .from('plan_sets')
    .select(
      '*, sheets(*, sheet_versions!sheet_id(*))'
    )
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
}

export function getSheet(client: TypedSupabaseClient, id: string) {
  return client
    .from('sheets')
    .select('*, sheet_versions!sheet_id(*)')
    .eq('id', id)
    .single();
}

export function getSheetVersion(client: TypedSupabaseClient, id: string) {
  return client
    .from('sheet_versions')
    .select('*')
    .eq('id', id)
    .single();
}

export function getAnnotations(
  client: TypedSupabaseClient,
  sheetVersionId: string
) {
  return client
    .from('annotations')
    .select('*')
    .eq('sheet_version_id', sheetVersionId)
    .order('created_at', { ascending: true });
}

export function getAnnotationPhotos(
  client: TypedSupabaseClient,
  annotationId: string
) {
  return client
    .from('photos')
    .select('*')
    .eq('annotation_id', annotationId)
    .order('created_at', { ascending: true });
}

export function getAnnotationComments(
  client: TypedSupabaseClient,
  annotationId: string
) {
  return client
    .from('comments')
    .select('*')
    .eq('annotation_id', annotationId)
    .order('created_at', { ascending: true });
}

export function getSheetTasks(
  client: TypedSupabaseClient,
  sheetId: string
) {
  return client
    .from('tasks')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('sort_order', { ascending: true });
}

export function getAnnotationTasks(
  client: TypedSupabaseClient,
  annotationId: string
) {
  return client
    .from('tasks')
    .select('*')
    .eq('annotation_id', annotationId)
    .order('sort_order', { ascending: true });
}

export function createAnnotation(
  client: TypedSupabaseClient,
  data: AnnotationInsert
) {
  return client.from('annotations').insert(data).select().single();
}

export function createPhoto(
  client: TypedSupabaseClient,
  data: PhotoInsert
) {
  return client.from('photos').insert(data).select().single();
}

export function updateAnnotation(
  client: TypedSupabaseClient,
  id: string,
  data: Database['public']['Tables']['annotations']['Update']
) {
  return client.from('annotations').update(data).eq('id', id).select().single();
}

export function deleteAnnotation(client: TypedSupabaseClient, id: string) {
  return client.from('annotations').delete().eq('id', id);
}

export function createAnnotationComment(
  client: TypedSupabaseClient,
  data: { annotation_id: string; user_id: string; body: string }
) {
  return client.from('comments').insert(data).select().single();
}
