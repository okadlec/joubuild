import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createDocument } from '@joubuild/supabase';
import { STORAGE_BUCKETS } from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';

export function useFileUpload(projectId: string) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (folderPath: string): Promise<boolean> => {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });

    if (result.canceled || !result.assets?.[0]) return false;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const ext = asset.name.split('.').pop() ?? 'bin';
      const sanitized = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${projectId}/${Date.now()}-${sanitized}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.DOCUMENTS)
        .upload(storagePath, arrayBuffer, {
          contentType: asset.mimeType ?? `application/octet-stream`,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.DOCUMENTS)
        .getPublicUrl(storagePath);

      const { error: dbError } = await createDocument(supabase, {
        project_id: projectId,
        name: asset.name,
        file_url: urlData.publicUrl,
        folder_path: folderPath,
        file_size: asset.size ?? null,
        mime_type: asset.mimeType ?? null,
        uploaded_by: user?.id ?? null,
      });

      if (dbError) throw dbError;
      return true;
    } catch (e) {
      console.error('File upload error:', e);
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading };
}
