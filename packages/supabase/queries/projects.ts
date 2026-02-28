import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export function getProjects(client: TypedSupabaseClient, organizationId: string) {
  return client
    .from('projects')
    .select(`
      *,
      project_members(user_id, role)
    `)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
}

export function getProject(client: TypedSupabaseClient, id: string) {
  return client
    .from('projects')
    .select(`
      *,
      project_members(user_id, role)
    `)
    .eq('id', id)
    .single();
}

export function createProject(client: TypedSupabaseClient, data: ProjectInsert) {
  return client.from('projects').insert(data).select().single();
}

export function updateProject(
  client: TypedSupabaseClient,
  id: string,
  data: ProjectUpdate
) {
  return client
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export function deleteProject(client: TypedSupabaseClient, id: string) {
  return client.from('projects').delete().eq('id', id);
}

export function getProjectMembers(client: TypedSupabaseClient, projectId: string) {
  return client
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);
}

export function addProjectMember(
  client: TypedSupabaseClient,
  data: { project_id: string; user_id: string; role: string }
) {
  return client.from('project_members').insert(data).select().single();
}

export function updateProjectMemberRole(
  client: TypedSupabaseClient,
  projectId: string,
  userId: string,
  role: string
) {
  return client
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .select()
    .single();
}

export function removeProjectMember(
  client: TypedSupabaseClient,
  projectId: string,
  userId: string
) {
  return client
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
}
