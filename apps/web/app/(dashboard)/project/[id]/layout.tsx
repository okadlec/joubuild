import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/shared/sidebar';
import { Header } from '@/components/shared/header';

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
    .single();

  if (!project) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projectId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={{
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name,
            avatar_url: user?.user_metadata?.avatar_url,
          }}
        />
        <div className="border-b bg-background px-6 py-3">
          <h2 className="text-lg font-semibold">{project.name}</h2>
          {project.address && (
            <p className="text-sm text-muted-foreground">{project.address}</p>
          )}
        </div>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
