'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Upload, ArrowLeft, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/compress-image';
import { sanitizeFileName } from '@joubuild/shared';

interface Photo {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  created_at: string;
}

interface AnnotationPhotosPanelProps {
  annotationId: string;
  projectId: string;
  readOnly?: boolean;
}

export function AnnotationPhotosPanel({ annotationId, projectId, readOnly = false }: AnnotationPhotosPanelProps) {
  const t = useTranslations('plans.annotationPhotos');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editPhotoCaption, setEditPhotoCaption] = useState('');
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('photos')
        .select('id, file_url, thumbnail_url, caption, created_at')
        .eq('annotation_id', annotationId)
        .order('created_at', { ascending: false });
      if (data) setPhotos(data);
    }
    load();
  }, [annotationId]);

  useEffect(() => {
    setExpandedPhotoId(null);
  }, [annotationId]);

  const handlePhotoUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    let successCount = 0;

    for (const file of fileArray) {
      const compressed = await compressImage(file);
      const fileName = `${projectId}/${Date.now()}-${sanitizeFileName(file.name.replace(/\.[^.]+$/, '.jpg'))}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, compressed, { contentType: 'image/jpeg' });

      if (uploadError) {
        toast.error(t('uploadError', { name: file.name, error: uploadError.message }));
        continue;
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('photos')
        .insert({
          project_id: projectId,
          annotation_id: annotationId,
          file_url: urlData.publicUrl,
          type: 'photo',
          taken_by: user?.id,
        })
        .select('id, file_url, thumbnail_url, caption, created_at')
        .single();

      if (error) {
        toast.error(t('saveError', { name: file.name, error: error.message }));
      } else if (data) {
        setPhotos(prev => [data, ...prev]);
        successCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(t('photosUploaded', { count: successCount }));
    }
  }, [projectId, annotationId]);

  const handleSavePhotoCaption = useCallback(async (photoId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('photos')
      .update({ caption: editPhotoCaption.trim() || null })
      .eq('id', photoId);

    if (error) {
      toast.error(error.message);
      return;
    }
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: editPhotoCaption.trim() || null } : p));
    setEditingPhotoId(null);
    setEditPhotoCaption('');
  }, [editPhotoCaption]);

  if (expandedPhotoId) {
    const photo = photos.find(p => p.id === expandedPhotoId);
    if (!photo) return null;
    return (
      <div className="space-y-3 p-3">
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpandedPhotoId(null)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('backToPhotos')}
        </button>
        <div className="overflow-hidden rounded-md border">
          <img
            src={photo.file_url}
            alt={photo.caption || 'Fotka'}
            className="w-full object-contain"
          />
        </div>
        {photo.caption && (
          <p className="text-sm text-muted-foreground">{photo.caption}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-3">
      {!readOnly && (
        <div className="mb-3 flex gap-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            id={`annotation-photo-camera-${annotationId}`}
            onChange={(e) => { if (e.target.files) handlePhotoUpload(e.target.files); e.target.value = ''; }}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id={`annotation-photo-gallery-${annotationId}`}
            onChange={(e) => { if (e.target.files) handlePhotoUpload(e.target.files); e.target.value = ''; }}
          />
          <Button
            size="sm"
            className="flex-1"
            onClick={() => document.getElementById(`annotation-photo-camera-${annotationId}`)?.click()}
            loading={uploading}
          >
            <Camera className="mr-1 h-4 w-4" />
            {t('takePhoto')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => document.getElementById(`annotation-photo-gallery-${annotationId}`)?.click()}
            loading={uploading}
          >
            <Upload className="mr-1 h-4 w-4" />
            {t('fromGallery')}
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t('noPhotos')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-md border">
              <button
                className="w-full"
                onClick={() => setExpandedPhotoId(photo.id)}
              >
                <img
                  src={photo.thumbnail_url || photo.file_url}
                  alt={photo.caption || 'Fotka'}
                  className="aspect-square w-full object-cover"
                />
              </button>
              <div className="p-1">
                {!readOnly && editingPhotoId === photo.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={editPhotoCaption}
                      onChange={(e) => setEditPhotoCaption(e.target.value)}
                      className="h-6 flex-1 text-xs"
                      placeholder={t('captionPlaceholder')}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePhotoCaption(photo.id);
                        if (e.key === 'Escape') setEditingPhotoId(null);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSavePhotoCaption(photo.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : readOnly ? (
                  <span className="block w-full truncate text-xs text-muted-foreground">
                    {photo.caption || ''}
                  </span>
                ) : (
                  <button
                    className="w-full truncate text-left text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setEditingPhotoId(photo.id); setEditPhotoCaption(photo.caption || ''); }}
                  >
                    {photo.caption || t('addCaption')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
