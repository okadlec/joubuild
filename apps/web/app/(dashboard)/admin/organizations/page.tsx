import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { OrgsList } from './orgs-list';

export default async function OrganizationsPage() {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) redirect('/admin');

  const supabase = await createClient();

  const [{ data: orgs }, { data: storageData }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, plan, organization_members(count), projects(count)')
      .order('name'),
    supabase.rpc('get_all_orgs_storage'),
  ]);

  const storageMap = new Map<string, number>();
  if (Array.isArray(storageData)) {
    for (const s of storageData) {
      storageMap.set(s.org_id, s.total ?? 0);
    }
  }

  const orgRows = (orgs ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    members_count: o.organization_members?.[0]?.count ?? 0,
    projects_count: o.projects?.[0]?.count ?? 0,
    storage_bytes: storageMap.get(o.id) ?? 0,
  }));

  return <OrgsList orgs={orgRows} />;
}
