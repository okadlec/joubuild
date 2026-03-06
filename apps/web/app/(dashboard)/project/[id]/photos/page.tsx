import { createClient } from '@/lib/supabase/server';
import { PhotosView } from '@/components/photos/photos-view';
import { ModuleGuard } from '@/components/shared/module-guard';

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: photos } = await supabase
    .from('photos')
    .select(`
      *,
      annotation:annotations!annotation_id (
        id,
        type,
        data,
        sheet_version:sheet_versions!sheet_version_id (
          id,
          thumbnail_url,
          width,
          height,
          sheet:sheets!sheet_id (
            id,
            name,
            plan_set:plan_sets!plan_set_id (
              name
            )
          )
        )
      )
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  // Flatten nested annotation → sheet data onto each photo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedPhotos = (photos || []).map((p: any) => {
    const annotation = p.annotation as Record<string, unknown> | null;
    const sheetVersion = annotation?.sheet_version as Record<string, unknown> | null;
    const sheet = sheetVersion?.sheet as Record<string, unknown> | null;
    const planSet = sheet?.plan_set as Record<string, unknown> | null;
    const { annotation: _a, ...rest } = p;
    return {
      ...rest,
      annotation_id: (annotation?.id as string) ?? p.annotation_id ?? null,
      annotation_type: (annotation?.type as string) ?? null,
      annotation_data: (annotation?.data as Record<string, unknown>) ?? null,
      sheet_version_id: (sheetVersion?.id as string) ?? null,
      sheet_version_thumbnail_url: (sheetVersion?.thumbnail_url as string) ?? null,
      sheet_version_width: (sheetVersion?.width as number) ?? null,
      sheet_version_height: (sheetVersion?.height as number) ?? null,
      sheet_id: (sheet?.id as string) ?? null,
      sheet_name: (sheet?.name as string) ?? null,
      plan_set_name: (planSet?.name as string) ?? null,
    };
  });

  return (
    <ModuleGuard projectId={id} module="photos">
      <PhotosView projectId={id} initialPhotos={enrichedPhotos} />
    </ModuleGuard>
  );
}
