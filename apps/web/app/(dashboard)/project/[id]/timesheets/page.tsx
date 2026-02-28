import { createClient } from '@/lib/supabase/server';
import { TimesheetView } from '@/components/tasks/timesheet-view';

export default async function TimesheetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('sort_order');

  return <TimesheetView projectId={id} tasks={tasks || []} />;
}
