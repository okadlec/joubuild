import { createClient } from '@/lib/supabase/server';
import { ProjectsList } from './projects-list';

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projekty</h1>
          <p className="text-sm text-muted-foreground">Správa stavebních projektů</p>
        </div>
      </div>
      <ProjectsList initialProjects={projects || []} />
    </div>
  );
}
