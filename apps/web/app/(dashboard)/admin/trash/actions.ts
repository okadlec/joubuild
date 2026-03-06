'use server';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractStoragePath(fileUrl: string, bucket: string): string | null {
  try {
    const url = new URL(fileUrl);
    const marker = `/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

async function cleanupStorageFiles(
  serviceClient: ReturnType<typeof getServiceClient>,
  paths: { bucket: string; path: string }[]
) {
  // Group by bucket
  const byBucket = new Map<string, string[]>();
  for (const { bucket, path } of paths) {
    const storagePath = extractStoragePath(path, bucket);
    if (!storagePath) continue;
    const existing = byBucket.get(bucket) || [];
    existing.push(storagePath);
    byBucket.set(bucket, existing);
  }

  for (const [bucket, filePaths] of byBucket) {
    // Supabase storage.remove accepts max ~100 files at a time
    for (let i = 0; i < filePaths.length; i += 100) {
      const batch = filePaths.slice(i, i + 100);
      await serviceClient.storage.from(bucket).remove(batch);
    }
  }
}

export async function restoreProject(projectId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Org admin can only restore projects from their org
  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (project?.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění' };
    }
  }

  const { error } = await serviceClient
    .from('projects')
    .update({ deleted_at: null })
    .eq('id', projectId);

  if (error) return { error: error.message };

  revalidatePath('/admin/trash');
  return { success: true };
}

export async function restorePlanSet(planSetId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Org admin can only restore plan sets from their org's projects
  if (!ctx.isSuperadmin) {
    const { data: planSet } = await serviceClient
      .from('plan_sets')
      .select('project_id, projects(organization_id)')
      .eq('id', planSetId)
      .single();
    const orgId = (planSet as any)?.projects?.organization_id;
    if (orgId !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění' };
    }
  }

  const { error } = await serviceClient
    .from('plan_sets')
    .update({ deleted_at: null })
    .eq('id', planSetId);

  if (error) return { error: error.message };

  revalidatePath('/admin/trash');
  return { success: true };
}

export async function permanentDeleteProject(projectId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Org admin scoping
  if (!ctx.isSuperadmin) {
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    if (project?.organization_id !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění' };
    }
  }

  // Get storage paths before deleting from DB
  const { data: storagePaths } = await serviceClient
    .rpc('get_project_storage_paths', { p_project_id: projectId });

  // Cleanup storage files
  if (storagePaths && storagePaths.length > 0) {
    await cleanupStorageFiles(serviceClient, storagePaths);
  }

  // Hard delete from DB (cascade will remove all dependent rows)
  const { error } = await serviceClient
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) return { error: error.message };

  revalidatePath('/admin/trash');
  return { success: true };
}

export async function permanentDeletePlanSet(planSetId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Org admin scoping
  if (!ctx.isSuperadmin) {
    const { data: planSet } = await serviceClient
      .from('plan_sets')
      .select('project_id, projects(organization_id)')
      .eq('id', planSetId)
      .single();
    const orgId = (planSet as any)?.projects?.organization_id;
    if (orgId !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění' };
    }
  }

  // Get storage paths before deleting from DB
  const { data: storagePaths } = await serviceClient
    .rpc('get_plan_set_storage_paths', { p_plan_set_id: planSetId });

  // Cleanup storage files
  if (storagePaths && storagePaths.length > 0) {
    await cleanupStorageFiles(serviceClient, storagePaths);
  }

  // Hard delete from DB (cascade will remove sheets, versions, etc.)
  const { error } = await serviceClient
    .from('plan_sets')
    .delete()
    .eq('id', planSetId);

  if (error) return { error: error.message };

  revalidatePath('/admin/trash');
  return { success: true };
}

export async function purgeExpired(days: number = 30) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get expired projects
  let projectsQuery = serviceClient
    .from('projects')
    .select('id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);

  if (!ctx.isSuperadmin && ctx.organizationId) {
    projectsQuery = projectsQuery.eq('organization_id', ctx.organizationId);
  }

  const { data: expiredProjects } = await projectsQuery;

  // Get expired plan sets
  let planSetsQuery = serviceClient
    .from('plan_sets')
    .select('id, projects(organization_id)')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);

  const { data: expiredPlanSets } = await planSetsQuery;

  let deletedCount = 0;

  // Delete expired projects
  for (const project of expiredProjects || []) {
    const result = await permanentDeleteProject(project.id);
    if (result.success) deletedCount++;
  }

  // Delete expired plan sets (filter by org for org admins)
  for (const planSet of expiredPlanSets || []) {
    if (!ctx.isSuperadmin && ctx.organizationId) {
      const orgId = (planSet as any)?.projects?.organization_id;
      if (orgId !== ctx.organizationId) continue;
    }
    const result = await permanentDeletePlanSet(planSet.id);
    if (result.success) deletedCount++;
  }

  revalidatePath('/admin/trash');
  return { success: true, deletedCount };
}
