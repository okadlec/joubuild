import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProjectShell } from './project-shell';

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

  return (
    <div>
      <div className="border-b bg-background px-3 py-2 sm:px-6 sm:py-3">
        <h2 className="text-base font-semibold sm:text-lg">{project.name}</h2>
        {project.address && (
          <p className="hidden text-sm text-muted-foreground sm:block">{project.address}</p>
        )}
      </div>
      <ProjectShell projectId={id}>
        {children}
      </ProjectShell>
    </div>
  );
}
