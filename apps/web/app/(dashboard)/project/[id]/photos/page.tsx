import { createClient } from '@/lib/supabase/server';
import { PhotosView } from '@/components/photos/photos-view';

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  return <PhotosView projectId={id} initialPhotos={photos || []} />;
}
