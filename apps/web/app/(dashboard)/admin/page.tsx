import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from './admin-dashboard';

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: projectsCount },
    { count: orgsCount },
    { data: users },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, email, full_name, is_superadmin, created_at').order('created_at', { ascending: false }),
  ]);

  return (
    <AdminDashboard
      stats={{
        users: usersCount || 0,
        projects: projectsCount || 0,
        organizations: orgsCount || 0,
      }}
      users={users || []}
    />
  );
}
