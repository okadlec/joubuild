import { createClient } from '@/lib/supabase/server';
import { ModuleGuard } from '@/components/shared/module-guard';
import { FilesView } from './files-view';

export default async function FilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: documents }, { data: folders }] = await Promise.all([
    supabase
      .from('documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('folders')
      .select('*')
      .eq('project_id', id)
      .order('name'),
  ]);

  return (
    <ModuleGuard projectId={id} module="files">
      <FilesView
        projectId={id}
        initialDocuments={documents || []}
        initialFolders={folders || []}
      />
    </ModuleGuard>
  );
}
