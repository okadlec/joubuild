import { redirect, notFound } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { UserDetail } from './user-detail';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) redirect('/admin');

  const { userId } = await params;
  const serviceClient = getServiceClient();

  // 1. User profile
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, email, full_name, is_superadmin, created_at')
    .eq('id', userId)
    .single();

  if (!profile) notFound();

  // 2. Org membership
  const { data: orgMembership } = await serviceClient
    .from('organization_members')
    .select('role, organization_id, organizations(name)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  // Org scoping for non-superadmin: user must be in admin's org
  if (!ctx.isSuperadmin) {
    if (!orgMembership || orgMembership.organization_id !== ctx.organizationId) {
      notFound();
    }
  }

  const orgFilter = ctx.isSuperadmin
    ? orgMembership?.organization_id
    : ctx.organizationId;

  // 3. Project memberships
  const { data: projectMemberships } = await serviceClient
    .from('project_members')
    .select('project_id, role, projects(id, name, status, organization_id)')
    .eq('user_id', userId);

  // Filter to org projects
  const memberProjects = (projectMemberships ?? [])
    .filter((pm: any) => !orgFilter || pm.projects?.organization_id === orgFilter)
    .map((pm: any) => ({
      project_id: pm.project_id,
      role: pm.role,
      name: pm.projects?.name ?? '',
      status: pm.projects?.status ?? 'active',
      organization_id: pm.projects?.organization_id,
    }));

  const projectIds = memberProjects.map((p: any) => p.project_id);

  // 4. Permissions & folders (only for member projects)
  const [permissionsResult, folderPermsResult, foldersResult] = await Promise.all([
    projectIds.length > 0
      ? serviceClient
          .from('project_member_permissions')
          .select('*')
          .eq('user_id', userId)
          .in('project_id', projectIds)
      : { data: [] },
    projectIds.length > 0
      ? serviceClient
          .from('folder_permissions')
          .select('*')
          .eq('user_id', userId)
          .in('project_id', projectIds)
      : { data: [] },
    projectIds.length > 0
      ? serviceClient
          .from('folders')
          .select('id, name, parent_id, project_id')
          .in('project_id', projectIds)
      : { data: [] },
  ]);

  // 5. Available projects (in org, where user is NOT yet a member)
  let availableProjects: { id: string; name: string }[] = [];
  if (orgFilter) {
    const { data: allOrgProjects } = await serviceClient
      .from('projects')
      .select('id, name')
      .eq('organization_id', orgFilter)
      .eq('status', 'active')
      .order('name');

    availableProjects = (allOrgProjects ?? []).filter(
      (p) => !projectIds.includes(p.id)
    );
  }

  return (
    <UserDetail
      profile={{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        is_superadmin: profile.is_superadmin,
        created_at: profile.created_at,
      }}
      orgMembership={
        orgMembership
          ? {
              role: orgMembership.role,
              organization_id: orgMembership.organization_id,
              org_name: (orgMembership.organizations as any)?.name ?? null,
            }
          : null
      }
      memberProjects={memberProjects}
      permissions={(permissionsResult as any).data ?? []}
      folderPermissions={(folderPermsResult as any).data ?? []}
      folders={(foldersResult as any).data ?? []}
      availableProjects={availableProjects}
    />
  );
}
