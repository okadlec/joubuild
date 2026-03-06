'use server';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { PERMISSION_MODULES } from '@joubuild/shared';
import type { ProjectRole } from '@joubuild/shared';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function updateProjectMemberRole(
  userId: string,
  projectId: string,
  role: ProjectRole
) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Verify project belongs to admin's org
  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (!project || project.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tento projekt' };
    }
  }

  const { error } = await serviceClient
    .from('project_members')
    .update({ role })
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateUserProjectPermissions(
  userId: string,
  projectId: string,
  permissions: {
    module: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[]
) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (!project || project.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tento projekt' };
    }
  }

  const rows = permissions.map((p) => ({
    project_id: projectId,
    user_id: userId,
    module: p.module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { error } = await serviceClient
    .from('project_member_permissions')
    .upsert(rows, { onConflict: 'project_id,user_id,module' });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateUserFolderPermissions(
  userId: string,
  projectId: string,
  folderPerms: {
    folder_id: string;
    can_view: boolean;
    can_create: boolean;
    can_delete: boolean;
  }[]
) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (!project || project.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tento projekt' };
    }
  }

  const rows = folderPerms.map((fp) => ({
    project_id: projectId,
    user_id: userId,
    folder_id: fp.folder_id,
    can_view: fp.can_view,
    can_create: fp.can_create,
    can_delete: fp.can_delete,
  }));

  const { error } = await serviceClient
    .from('folder_permissions')
    .upsert(rows, { onConflict: 'project_id,user_id,folder_id' });

  if (error) return { error: error.message };
  return { success: true };
}

export async function addUserToProject(
  userId: string,
  projectId: string,
  role: ProjectRole
) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (!project || project.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tento projekt' };
    }
  }

  // Check not already a member
  const { data: existing } = await serviceClient
    .from('project_members')
    .select('id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) return { error: 'Uživatel je již členem tohoto projektu' };

  const { error } = await serviceClient
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role });

  if (error) return { error: error.message };

  // Create default permissions for all modules
  const defaultPerms = PERMISSION_MODULES.map((mod) => ({
    project_id: projectId,
    user_id: userId,
    module: mod,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: false,
  }));

  await serviceClient
    .from('project_member_permissions')
    .upsert(defaultPerms, { onConflict: 'project_id,user_id,module' });

  return { success: true };
}

export async function removeUserFromProject(userId: string, projectId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (!project || project.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tento projekt' };
    }
  }

  // Delete permissions first (if no cascade)
  await serviceClient
    .from('project_member_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  await serviceClient
    .from('folder_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  const { error } = await serviceClient
    .from('project_members')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) return { error: error.message };
  return { success: true };
}
