import { createClient } from '@/lib/supabase/server';
import { DocumentsView } from './documents-view';

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  return <DocumentsView projectId={id} initialDocuments={documents || []} />;
}
