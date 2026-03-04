import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProjectSettings } from './project-settings';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: members }, { data: categories }, { data: permissions }, { data: folderPermissions }, { data: folders }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('project_members').select('*').eq('project_id', id),
    supabase.from('task_categories').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('project_member_permissions').select('*').eq('project_id', id),
    supabase.from('folder_permissions').select('*').eq('project_id', id),
    supabase.from('folders').select('*').eq('project_id', id).order('name'),
  ]);

  if (!project) {
    notFound();
  }

  // Fetch profiles for member display
  const userIds = (members || []).map(m => m.user_id);
  let profiles: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profileData) {
      profiles = Object.fromEntries(
        profileData.map(p => [p.id, { full_name: p.full_name, email: p.email }])
      );
    }
  }

  return (
    <ProjectSettings
      project={project}
      members={(members || []).map(m => ({
        ...m,
        full_name: profiles[m.user_id]?.full_name || null,
        email: profiles[m.user_id]?.email || null,
      }))}
      initialCategories={categories || []}
      initialPermissions={permissions || []}
      initialFolderPermissions={folderPermissions || []}
      folders={(folders || []).map(f => ({ id: f.id, name: f.name, parent_id: f.parent_id }))}
    />
  );
}
