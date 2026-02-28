import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export function getTasks(
  client: TypedSupabaseClient,
  projectId: string,
  filters?: {
    status?: string;
    assignee_id?: string;
    category_id?: string;
    sheet_id?: string;
  }
) {
  let query = client
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
  if (filters?.category_id) query = query.eq('category_id', filters.category_id);
  if (filters?.sheet_id) query = query.eq('sheet_id', filters.sheet_id);

  return query.order('sort_order', { ascending: true });
}

export function getTask(client: TypedSupabaseClient, id: string) {
  return client.from('tasks').select('*').eq('id', id).single();
}

export function createTask(client: TypedSupabaseClient, data: TaskInsert) {
  return client.from('tasks').insert(data).select().single();
}

export function updateTask(
  client: TypedSupabaseClient,
  id: string,
  data: TaskUpdate
) {
  return client
    .from('tasks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export function deleteTask(client: TypedSupabaseClient, id: string) {
  return client.from('tasks').delete().eq('id', id);
}

export function getTaskComments(client: TypedSupabaseClient, taskId: string) {
  return client
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
}

export function createComment(
  client: TypedSupabaseClient,
  data: { task_id: string; user_id: string; body: string }
) {
  return client.from('comments').insert(data).select().single();
}
