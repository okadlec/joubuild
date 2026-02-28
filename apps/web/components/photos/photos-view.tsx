'use client';

import { useState, useCallback, useMemo } from 'react';
import { Upload, Camera, X, Download, Search, Filter, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate } from '@joubuild/shared';
import { toast } from 'sonner';
import { Photo360Viewer } from './photo-360-viewer';

interface Photo {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  type: string;
  tags: string[] | null;
  taken_at: string | null;
  created_at: string;
  markup_data: Record<string, unknown> | null;
}

export function PhotosView({ projectId, initialPhotos }: { projectId: string; initialPhotos: Photo[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    photos.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(p.caption || '').toLowerCase().includes(q) &&
            !(p.tags || []).some(t => t.toLowerCase().includes(q))) return false;
      }
      if (dateFrom) {
        const photoDate = (p.taken_at || p.created_at).slice(0, 10);
        if (photoDate < dateFrom) return false;
      }
      if (dateTo) {
        const photoDate = (p.taken_at || p.created_at).slice(0, 10);
        if (photoDate > dateTo) return false;
      }
      if (tagFilter && !(p.tags || []).includes(tagFilter)) return false;
      return true;
    });
  }, [photos, searchQuery, dateFrom, dateTo, tagFilter]);

  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of Array.from(files)) {
      const fileName = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Chyba při nahrávání ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('photos')
        .insert({
          project_id: projectId,
          file_url: urlData.publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'photo',
          taken_by: user?.id,
        })
        .select()
        .single();

      if (!error && data) {
        setPhotos(prev => [data, ...prev]);
      }
    }

    setUploading(false);
    toast.success('Fotky nahrány');
  }, [projectId]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setTagFilter('');
  };

  const handleDelete = useCallback(async (photo: Photo) => {
    if (!confirm('Opravdu chcete smazat tuto fotku?')) return;

    const supabase = getSupabaseClient();

    // Extract storage path from URL: {projectId}/{timestamp}-{filename}
    const url = new URL(photo.file_url);
    const pathParts = url.pathname.split('/photos/');
    const storagePath = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : null;

    // Delete from database
    const { error } = await supabase.from('photos').delete().eq('id', photo.id);
    if (error) {
      toast.error('Chyba při mazání fotky');
      return;
    }

    // Delete from storage
    if (storagePath) {
      await supabase.storage.from('photos').remove([storagePath]);
    }

    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setSelectedPhoto(null);
    toast.success('Fotka smazána');
  }, []);

  const activeFilterCount = [searchQuery, dateFrom, dateTo, tagFilter].filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fotogalerie</h1>
          <p className="text-sm text-muted-foreground">
            {filteredPhotos.length}{filteredPhotos.length !== photos.length ? ` z ${photos.length}` : ''} fotek
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtr
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            id="photo-upload"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <Button onClick={() => document.getElementById('photo-upload')?.click()} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Nahrávání...' : 'Nahrát fotky'}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="mb-4 space-y-3 rounded-lg border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 pl-8"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-auto"
              placeholder="Od"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-auto"
              placeholder="Do"
            />
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Všechny tagy</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8" onClick={handleClearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Zrušit
              </Button>
            )}
          </div>
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">{photos.length === 0 ? 'Žádné fotky' : 'Žádné fotky odpovídající filtru'}</p>
          {photos.length === 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Nahrajte fotky ze stavby</p>
              <Button onClick={() => document.getElementById('photo-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Nahrát fotky
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Zrušit filtry
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-square bg-muted">
                <img
                  src={photo.thumbnail_url || photo.file_url}
                  alt={photo.caption || 'Fotka ze stavby'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-2">
                {photo.caption && (
                  <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
                )}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {photo.tags.slice(0, 3).map(t => (
                      <Badge key={t} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Photo detail dialog */}
      <Dialog open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} className="max-w-4xl">
        {selectedPhoto && (
          <>
            <DialogHeader>
              <DialogTitle>{selectedPhoto.caption || 'Fotka'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPhoto.type === 'photo_360' ? (
                <Photo360Viewer imageUrl={selectedPhoto.file_url} />
              ) : (
                <img
                  src={selectedPhoto.file_url}
                  alt={selectedPhoto.caption || ''}
                  className="max-h-[60vh] w-full rounded object-contain"
                />
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{formatDate(selectedPhoto.created_at)}</span>
                  {selectedPhoto.tags && selectedPhoto.tags.map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    toast.info('Markup editor - otevírá se v nové verzi');
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Markup
                  </Button>
                  <a href={selectedPhoto.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Stáhnout
                    </Button>
                  </a>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedPhoto)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Smazat
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
