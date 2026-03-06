import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { ProjectSettings } from './project-settings';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: project }, { data: rawMembers, error: membersError }, { data: categories }, { data: permissions }, { data: folderPermissions }, { data: folders }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).maybeSingle(),
    serviceClient.from('project_members').select('*').eq('project_id', id),
    supabase.from('task_categories').select('*').eq('project_id', id).order('sort_order'),
    serviceClient.from('project_member_permissions').select('*').eq('project_id', id),
    serviceClient.from('folder_permissions').select('*').eq('project_id', id),
    supabase.from('folders').select('*').eq('project_id', id).order('name'),
  ]);

  if (membersError) {
    console.error('[SettingsPage] Members query error:', membersError.message);
  }

  // Fetch profiles separately to avoid fragile cross-schema FK join
  const userIds = (rawMembers || []).map(m => m.user_id).filter(Boolean);
  const { data: profiles } = userIds.length > 0
    ? await serviceClient.from('profiles').select('id, email, full_name').in('id', userIds)
    : { data: [] as { id: string; email: string; full_name: string }[] };

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  const members = (rawMembers || []).map(m => ({
    ...m,
    full_name: profileMap.get(m.user_id)?.full_name || null,
    email: profileMap.get(m.user_id)?.email || null,
  }));

  if (!project) {
    notFound();
  }

  return (
    <ProjectSettings
      project={project}
      members={members}
      initialCategories={categories || []}
      initialPermissions={permissions || []}
      initialFolderPermissions={folderPermissions || []}
      folders={(folders || []).map(f => ({ id: f.id, name: f.name, parent_id: f.parent_id }))}
    />
  );
}
