'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentAdminContext } from '@/lib/supabase/admin';

export async function addMember(projectId: string, email: string, role: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Nejste přihlášen' };
  }

  // Check caller is admin
  const { data: callerMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (callerMember?.role !== 'admin') {
    const adminCtx = await getCurrentAdminContext();
    if (!adminCtx?.isSuperadmin && !adminCtx?.isOrgAdmin) {
      return { error: 'Nemáte oprávnění přidávat členy' };
    }
  }

  // Use service role to look up user by email in profiles
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    return { error: 'Uživatel s tímto emailem nebyl nalezen. Uživatel se musí nejdříve zaregistrovat.' };
  }

  // Check if already a member
  const { data: existing } = await serviceClient
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    return { error: 'Uživatel je již členem projektu' };
  }

  // Add as member
  const { error } = await serviceClient
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: profile.id,
      role,
    });

  if (error) {
    return { error: error.message };
  }

  console.log('[addMember] Insert successful for project:', projectId, 'user:', profile.id, 'role:', role);
  console.log('[addMember] Calling revalidatePath for:', `/project/${projectId}/settings`);
  revalidatePath(`/project/${projectId}/settings`);
  return { success: true };
}

export async function searchUsers(projectId: string, query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: [] };
  }

  // Get existing member user_ids to exclude them
  const { data: existingMembers } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const excludeIds = (existingMembers || []).map(m => m.user_id);

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const trimmed = query.trim();
  let queryBuilder = serviceClient
    .from('profiles')
    .select('id, email, full_name');

  if (trimmed) {
    queryBuilder = queryBuilder.or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`);
  }

  const { data: profiles } = await queryBuilder;

  const filtered = (profiles || []).filter(p => !excludeIds.includes(p.id));

  return { data: filtered };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Nejste přihlášen' };
  }

  const { error } = await supabase.rpc('soft_delete_project', { p_id: projectId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/projects');
  return { success: true };
}
