import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProjectSettings } from './project-settings';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: members }, { data: categories }, { data: permissions }, { data: folderPermissions }, { data: folders }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('project_members').select('*, profiles:user_id(email, full_name)').eq('project_id', id),
    supabase.from('task_categories').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('project_member_permissions').select('*').eq('project_id', id),
    supabase.from('folder_permissions').select('*').eq('project_id', id),
    supabase.from('folders').select('*').eq('project_id', id).order('name'),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectSettings
      project={project}
      members={(members || []).map(m => ({
        ...m,
        full_name: (m as any).profiles?.full_name || null,
        email: (m as any).profiles?.email || null,
      }))}
      initialCategories={categories || []}
      initialPermissions={permissions || []}
      initialFolderPermissions={folderPermissions || []}
      folders={(folders || []).map(f => ({ id: f.id, name: f.name, parent_id: f.parent_id }))}
    />
  );
}
