import { redirect } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { TrashView } from './trash-view';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function TrashPage() {
  const ctx = await getCurrentAdminContext();
  if (!ctx) redirect('/projects');

  const serviceClient = getServiceClient();

  // Fetch deleted projects
  let projectsQuery = serviceClient
    .from('projects')
    .select('id, name, deleted_at, organization_id')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (!ctx.isSuperadmin && ctx.organizationId) {
    projectsQuery = projectsQuery.eq('organization_id', ctx.organizationId);
  }

  // Fetch deleted plan sets with project name
  let planSetsQuery = serviceClient
    .from('plan_sets')
    .select('id, name, deleted_at, project_id, projects(name, organization_id)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  const [{ data: projects }, { data: planSetsRaw }] = await Promise.all([
    projectsQuery,
    planSetsQuery,
  ]);

  // Filter plan sets by org for org admins
  let planSets = (planSetsRaw || []).map((ps: any) => ({
    id: ps.id,
    name: ps.name,
    deleted_at: ps.deleted_at,
    project_id: ps.project_id,
    project_name: ps.projects?.name ?? null,
    organization_id: ps.projects?.organization_id ?? null,
  }));

  if (!ctx.isSuperadmin && ctx.organizationId) {
    planSets = planSets.filter((ps: any) => ps.organization_id === ctx.organizationId);
  }

  return (
    <TrashView
      projects={projects ?? []}
      planSets={planSets}
    />
  );
}
