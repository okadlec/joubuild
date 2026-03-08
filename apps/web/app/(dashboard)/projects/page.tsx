import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { ProjectsList } from './projects-list';

export default async function ProjectsPage() {
  const t = await getTranslations('projects');
  const supabase = await createClient();

  const [{ data: projects }, { data: memberEntries }] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase
      .from('project_members')
      .select('project_id'),
  ]);

  const userProjectIds = (memberEntries || []).map(m => m.project_id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>
      <ProjectsList initialProjects={projects || []} userProjectIds={userProjectIds} />
    </div>
  );
}
