'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Download, Trash2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatFileSize } from '@joubuild/shared';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  folder_path: string;
  created_at: string;
}

export function DocumentsView({ projectId, initialDocuments }: { projectId: string; initialDocuments: Document[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of Array.from(files)) {
      const fileName = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Chyba: ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (!error && data) {
        setDocuments(prev => [data, ...prev]);
      }
    }

    setUploading(false);
    toast.success('Dokumenty nahrány');
  }, [projectId]);

  async function handleDelete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success('Dokument smazán');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dokumenty</h1>
          <p className="text-sm text-muted-foreground">{documents.length} dokumentů</p>
        </div>
        <div>
          <input
            type="file"
            multiple
            className="hidden"
            id="doc-upload"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <Button onClick={() => document.getElementById('doc-upload')?.click()} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Nahrávání...' : 'Nahrát'}
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Folder className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Žádné dokumenty</p>
          <p className="mb-4 text-sm text-muted-foreground">Nahrajte dokumenty k projektu</p>
          <Button onClick={() => document.getElementById('doc-upload')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Nahrát
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
