'use client';

import { useState, useCallback } from 'react';
import { Upload, BookOpen, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatFileSize } from '@joubuild/shared';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { SimplePdfViewer } from '@/components/shared/simple-pdf-viewer';
import { toast } from 'sonner';

interface Specification {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

export function SpecificationsView({
  projectId,
  initialSpecifications,
}: {
  projectId: string;
  initialSpecifications: Specification[];
}) {
  const [specifications, setSpecifications] = useState(initialSpecifications);
  const [uploading, setUploading] = useState(false);
  const [viewingSpec, setViewingSpec] = useState<Specification | null>(null);

  const { hasPermission } = usePermissions(projectId);
  const canCreate = hasPermission('specifications', 'can_create');
  const canDelete = hasPermission('specifications', 'can_delete');

  const handleUpload = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);

      // Validate: only PDF
      const nonPdf = fileArray.filter(f => f.type !== 'application/pdf');
      if (nonPdf.length > 0) {
        toast.error('Povoleny jsou pouze PDF soubory');
        return;
      }

      setUploading(true);
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      for (const file of fileArray) {
        const fileName = `${projectId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('specifications')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Chyba: ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('specifications')
          .getPublicUrl(fileName);

        const { data, error } = await supabase
          .from('specifications')
          .insert({
            project_id: projectId,
            name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            uploaded_by: user?.id,
          })
          .select()
          .single();

        if (!error && data) {
          setSpecifications(prev => [data, ...prev]);
        }
      }

      setUploading(false);
      toast.success('Specifikace nahrány');
    },
    [projectId]
  );

  async function handleDelete(id: string) {
    if (!confirm('Opravdu chcete smazat tuto specifikaci?')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('specifications').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSpecifications(prev => prev.filter(s => s.id !== id));
    toast.success('Specifikace smazána');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Specifikace</h1>
          <p className="text-sm text-muted-foreground">
            {specifications.length} specifikací
          </p>
        </div>
        {canCreate && (
          <div>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              id="spec-upload"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />
            <Button
              onClick={() => document.getElementById('spec-upload')?.click()}
              loading={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Nahrávání...' : 'Nahrát PDF'}
            </Button>
          </div>
        )}
      </div>

      {specifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Žádné specifikace</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Nahrajte PDF specifikace k projektu
          </p>
          {canCreate && (
            <Button onClick={() => document.getElementById('spec-upload')?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Nahrát PDF
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {specifications.map(spec => (
            <Card key={spec.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <button
                      className="font-medium text-left hover:underline"
                      onClick={() => setViewingSpec(spec)}
                    >
                      {spec.name}
                    </button>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {spec.file_size && <span>{formatFileSize(spec.file_size)}</span>}
                      <span>{formatDate(spec.created_at)}</span>
                    </div>
                    {spec.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewingSpec(spec)}
                    title="Zobrazit PDF"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <a href={spec.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(spec.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Viewer */}
      {viewingSpec && (
        <SimplePdfViewer
          fileUrl={viewingSpec.file_url}
          fileName={viewingSpec.name}
          onClose={() => setViewingSpec(null)}
        />
      )}
    </div>
  );
}
