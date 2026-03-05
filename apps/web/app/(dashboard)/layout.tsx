import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/shared/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Load projects for sidebar selector
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  return (
    <DashboardShell
      user={{
        email: user.email || '',
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
      }}
      projects={projects || []}
    >
      {children}
    </DashboardShell>
  );
}
