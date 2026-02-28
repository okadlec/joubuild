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

  return (
    <TasksView
      projectId={id}
      initialTasks={tasks || []}
      categories={categories || []}
      members={members || []}
    />
  );
}
