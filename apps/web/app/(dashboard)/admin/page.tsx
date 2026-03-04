import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { AdminOverview } from './admin-overview';

export default async function AdminPage() {
  const ctx = await getCurrentAdminContext();
  if (!ctx) redirect('/projects');

  const supabase = await createClient();

  if (ctx.isSuperadmin) {
    const [
      { count: usersCount },
      { count: projectsCount },
      { count: orgsCount },
      { data: dbSizeData },
      { data: storageData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_database_size'),
      supabase.rpc('get_platform_storage_stats'),
    ]);

    const storage = storageData ?? { photos: 0, documents: 0, sheets: 0, total: 0 };

    return (
      <AdminOverview
        kind="superadmin"
        stats={{
          users: usersCount ?? 0,
          projects: projectsCount ?? 0,
          organizations: orgsCount ?? 0,
          dbSize: typeof dbSizeData === 'number' ? dbSizeData : 0,
        }}
        storage={storage}
      />
    );
  }

  // Org admin
  const orgId = ctx.organizationId!;

  const [
    { count: membersCount },
    { count: projectsCount },
    { data: storageData },
  ] = await Promise.all([
    supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase.rpc('get_org_storage_stats', { org_id: orgId }),
  ]);

  const storage = storageData ?? { photos: 0, documents: 0, sheets: 0, total: 0 };

  return (
    <AdminOverview
      kind="org-admin"
      stats={{
        members: membersCount ?? 0,
        projects: projectsCount ?? 0,
      }}
      storage={storage}
    />
  );
}
