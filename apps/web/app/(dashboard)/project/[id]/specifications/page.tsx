import { createClient } from '@/lib/supabase/server';
import { ModuleGuard } from '@/components/shared/module-guard';
import { SpecificationsView } from './specifications-view';

export default async function SpecificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: specifications } = await supabase
    .from('specifications')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  return (
    <ModuleGuard projectId={id} module="specifications">
      <SpecificationsView projectId={id} initialSpecifications={specifications || []} />
    </ModuleGuard>
  );
}
