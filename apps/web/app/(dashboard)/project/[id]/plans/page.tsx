import { createClient } from '@/lib/supabase/server';
import { PlansView } from '@/components/plans/plans-view';

export default async function PlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: planSets } = await supabase
    .from('plan_sets')
    .select(`
      *,
      sheets(
        *,
        sheet_versions(*)
      )
    `)
    .eq('project_id', id)
    .order('sort_order');

  return <PlansView projectId={id} initialPlanSets={planSets || []} />;
}
