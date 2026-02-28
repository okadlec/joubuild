import { createClient } from '@/lib/supabase/server';
import { FormsView } from '@/components/forms/forms-view';

export default async function FormsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: templates }, { data: submissions }, { data: rfis }] = await Promise.all([
    supabase
      .from('form_templates')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('form_submissions')
      .select('*, form_templates(name, type)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('rfis')
      .select('*')
      .eq('project_id', id)
      .order('number', { ascending: false }),
  ]);

  return (
    <FormsView
      projectId={id}
      initialTemplates={templates || []}
      initialSubmissions={submissions || []}
      initialRfis={rfis || []}
    />
  );
}
