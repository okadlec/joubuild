import { createClient } from '@/lib/supabase/server';
import { TasksView } from '@/components/tasks/tasks-view';

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tasks }, { data: categories }, { data: members }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .eq('project_id', id)
      .order('sort_order'),
    supabase
      .from('task_categories')
      .select('*')
      .eq('project_id', id)
      .order('sort_order'),
    supabase
      .from('project_members')
      .select('*')
      .eq('project_id', id),
  ]);

  // Fetch profiles for member names
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

  const enrichedMembers = (members || []).map(m => ({
    ...m,
    full_name: profiles[m.user_id]?.full_name || null,
    email: profiles[m.user_id]?.email || undefined,
  }));

  return (
    <TasksView
      projectId={id}
      initialTasks={tasks || []}
      categories={categories || []}
      members={enrichedMembers}
    />
  );
}
