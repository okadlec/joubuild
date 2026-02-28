import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/shared/dashboard-shell';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <DashboardShell
      user={{
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name,
        avatar_url: user?.user_metadata?.avatar_url,
      }}
      projectId={id}
      projectBar={
        <div className="border-b bg-background px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold">{project.name}</h2>
          {project.address && (
            <p className="text-sm text-muted-foreground">{project.address}</p>
          )}
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
