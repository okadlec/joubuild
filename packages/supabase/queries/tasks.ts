import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
type ChecklistInsert = Database['public']['Tables']['checklists']['Insert'];

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

// Checklists

export function getChecklists(client: TypedSupabaseClient, taskId: string) {
  return client
    .from('checklists')
    .select('*')
    .eq('task_id', taskId)
    .order('sort_order', { ascending: true });
}

export function createChecklistItem(
  client: TypedSupabaseClient,
  data: ChecklistInsert
) {
  return client.from('checklists').insert(data).select().single();
}

export function toggleChecklistItem(
  client: TypedSupabaseClient,
  id: string,
  isChecked: boolean
) {
  return client
    .from('checklists')
    .update({ is_checked: isChecked })
    .eq('id', id);
}

export function deleteChecklistItem(
  client: TypedSupabaseClient,
  id: string
) {
  return client.from('checklists').delete().eq('id', id);
}

// Tags

export function getTaskTags(client: TypedSupabaseClient, taskId: string) {
  return client
    .from('task_tags')
    .select('tag_id, tags!inner(id, name)')
    .eq('task_id', taskId);
}

export function getProjectTags(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client.from('tags').select('*').eq('project_id', projectId);
}

export async function syncTaskTags(
  client: TypedSupabaseClient,
  taskId: string,
  tagIds: string[]
) {
  await client.from('task_tags').delete().eq('task_id', taskId);
  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ task_id: taskId, tag_id }));
    await client.from('task_tags').insert(rows);
  }
}

export function createTag(
  client: TypedSupabaseClient,
  data: { project_id: string; name: string }
) {
  return client.from('tags').insert(data).select().single();
}

// Categories

export function getTaskCategories(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('task_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
}
