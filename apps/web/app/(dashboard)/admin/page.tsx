import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from './admin-dashboard';

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: projectsCount },
    { count: orgsCount },
    { data: users },
    { data: orgMembers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, email, full_name, is_superadmin, created_at').order('created_at', { ascending: false }),
    supabase.from('organization_members').select('user_id, role'),
  ]);

  // Build a map of userId -> orgRole
  const orgRoleMap: Record<string, string> = {};
  if (orgMembers) {
    for (const m of orgMembers) {
      orgRoleMap[m.user_id] = m.role;
    }
  }

  return (
    <AdminDashboard
      stats={{
        users: usersCount || 0,
        projects: projectsCount || 0,
        organizations: orgsCount || 0,
      }}
      users={users || []}
      orgRoleMap={orgRoleMap}
    />
  );
}
