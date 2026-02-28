import { createClient } from '@/lib/supabase/server';
import { PlansView } from '@/components/plans/plans-view';

export default async function PlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  console.log('[PlansPage] user:', user?.id, user?.email);

  const { data: planSets, error } = await supabase
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

  console.log('[PlansPage] planSets:', planSets?.length, 'error:', error?.message);

  return <PlansView projectId={id} initialPlanSets={planSets || []} />;
}
