import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

export function getDocuments(
  client: TypedSupabaseClient,
  projectId: string,
  folderPath?: string
) {
  let query = client
    .from('documents')
    .select('*')
    .eq('project_id', projectId);

  if (folderPath !== undefined) {
    query = query.eq('folder_path', folderPath);
  }

  return query.order('name', { ascending: true });
}

export function createDocument(
  client: TypedSupabaseClient,
  data: DocumentInsert
) {
  return client.from('documents').insert(data).select().single();
}

export function deleteDocument(client: TypedSupabaseClient, id: string) {
  return client.from('documents').delete().eq('id', id);
}

export function getDocumentFolders(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('documents')
    .select('folder_path')
    .eq('project_id', projectId);
}
