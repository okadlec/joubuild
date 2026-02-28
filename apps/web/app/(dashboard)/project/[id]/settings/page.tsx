import { createClient } from '@/lib/supabase/server';
import { ProjectSettings } from './project-settings';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: members }, { data: categories }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('project_members').select('*').eq('project_id', id),
    supabase.from('task_categories').select('*').eq('project_id', id).order('sort_order'),
  ]);

  return (
    <ProjectSettings
      project={project!}
      members={members || []}
      initialCategories={categories || []}
    />
  );
}
