'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Upload, Camera, X, Download, Search, Filter, Pencil, Trash2, Check, MapPin, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatRelativeTime, sanitizeFileName } from '@joubuild/shared';
import { Avatar } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Photo360Viewer } from './photo-360-viewer';
import { AnnotationPlanPreview } from './annotation-plan-preview';
import { TagPicker } from '@/components/shared/tag-picker';
import { compressImage } from '@/lib/compress-image';
import { useTranslations } from 'next-intl';
import { usePermissions } from '@/lib/hooks/use-permissions';

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
  annotation_id?: string | null;
  annotation_type?: string | null;
  annotation_data?: Record<string, unknown> | null;
  sheet_version_id?: string | null;
  sheet_version_thumbnail_url?: string | null;
  sheet_version_width?: number | null;
  sheet_version_height?: number | null;
  sheet_id?: string | null;
  sheet_name?: string | null;
  plan_set_name?: string | null;
}

export function PhotosView({ projectId, initialPhotos }: { projectId: string; initialPhotos: Photo[] }) {
  const router = useRouter();
  const t = useTranslations('photos');
  const tCommon = useTranslations('common');
  const { hasPermission } = usePermissions(projectId);
  const canCreate = hasPermission('photos', 'can_create');
  const [photos, setPhotos] = useState(initialPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Photo comments state
  const [photoComments, setPhotoComments] = useState<Array<{
    id: string; user_id: string | null; body: string; created_at: string;
    user_name?: string | null; user_email?: string | null;
  }>>([]);
  const [commentBody, setCommentBody] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const commentBottomRef = useRef<HTMLDivElement>(null);

  // Load comments when a photo is selected
  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoComments([]);
      setShowComments(false);
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    async function loadComments() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('photo_id', selectedPhoto!.id)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (data) {
        const userIds = [...new Set(data.map(c => c.user_id).filter(Boolean))] as string[];
        const { data: profileRows } = userIds.length
          ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
        const pm = Object.fromEntries((profileRows || []).map(p => [p.id, p]));

        if (cancelled) return;
        setPhotoComments(data.map(c => ({
          id: c.id as string,
          user_id: c.user_id as string | null,
          body: c.body as string,
          created_at: c.created_at as string,
          user_name: c.user_id ? pm[c.user_id]?.full_name ?? null : null,
          user_email: c.user_id ? pm[c.user_id]?.email ?? null : null,
        })));
      }
    }

    loadComments();

    // Realtime subscription for new comments
    const channel = supabase
      .channel(`photo-comments-${selectedPhoto.id}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `photo_id=eq.${selectedPhoto.id}` },
        async (payload: { new: { id: string; user_id: string | null; body: string; created_at: string } }) => {
          let userName: string | null = null;
          let userEmail: string | null = null;
          if (payload.new.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', payload.new.user_id)
              .maybeSingle();
            if (profile) {
              userName = profile.full_name;
              userEmail = profile.email;
            }
          }
          const enriched = { ...payload.new, user_name: userName, user_email: userEmail };
          setPhotoComments(prev => {
            if (prev.some(c => c.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedPhoto?.id]);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (showComments) {
      commentBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [photoComments.length, showComments]);

  const handleSendPhotoComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || !selectedPhoto) return;

    setSendingComment(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('comments').insert({
      photo_id: selectedPhoto.id,
      user_id: user?.id,
      body: commentBody.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      setCommentBody('');
    }
    setSendingComment(false);
  }, [selectedPhoto, commentBody]);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [planSetFilter, setPlanSetFilter] = useState('');

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    photos.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [photos]);

  // All unique plan sets
  const allPlanSets = useMemo(() => {
    const sets = new Set<string>();
    photos.forEach(p => { if (p.plan_set_name) sets.add(p.plan_set_name); });
    return Array.from(sets).sort();
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
      if (planSetFilter && p.plan_set_name !== planSetFilter) return false;
      return true;
    });
  }, [photos, searchQuery, dateFrom, dateTo, tagFilter, planSetFilter]);

  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const uploadBlob = isImage ? await compressImage(file) : file;
      const ext = isImage ? '.jpg' : file.name.match(/\.[^.]+$/)?.[0] || '';
      const fileName = `${projectId}/${Date.now()}-${sanitizeFileName(file.name.replace(/\.[^.]+$/, ext))}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, uploadBlob, isImage ? { contentType: 'image/jpeg', cacheControl: '31536000' } : undefined);

      if (uploadError) {
        toast.error(t('uploadError', { name: file.name }));
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
          file_size: uploadBlob.size,
        })
        .select()
        .single();

      if (!error && data) {
        setPhotos(prev => [data, ...prev]);
      }
    }

    setUploading(false);
    toast.success(t('uploadSuccess'));
  }, [projectId]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setTagFilter('');
    setPlanSetFilter('');
  };

  const handleDelete = useCallback(async (photo: Photo) => {
    if (!confirm(t('deleteConfirm'))) return;

    const supabase = getSupabaseClient();

    // Extract storage path from URL: {projectId}/{timestamp}-{filename}
    const url = new URL(photo.file_url);
    const pathParts = url.pathname.split('/photos/');
    const storagePath = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : null;

    // Delete from database
    const { error } = await supabase.from('photos').delete().eq('id', photo.id);
    if (error) {
      toast.error(t('deleteError'));
      return;
    }

    // Delete from storage
    if (storagePath) {
      await supabase.storage.from('photos').remove([storagePath]);
    }

    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setSelectedPhoto(null);
    toast.success(t('photoDeleted'));
  }, []);

  const handleStartEdit = useCallback(() => {
    if (!selectedPhoto) return;
    setEditCaption(selectedPhoto.caption || '');
    setEditTags(selectedPhoto.tags || []);
    setEditingPhoto(true);
  }, [selectedPhoto]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedPhoto) return;
    setSavingEdit(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('photos')
      .update({
        caption: editCaption.trim() || null,
        tags: editTags.length > 0 ? editTags : null,
      })
      .eq('id', selectedPhoto.id);

    if (error) {
      toast.error(error.message);
      setSavingEdit(false);
      return;
    }

    const updated = { ...selectedPhoto, caption: editCaption.trim() || null, tags: editTags.length > 0 ? editTags : null };
    setPhotos(prev => prev.map(p => p.id === selectedPhoto.id ? updated : p));
    setSelectedPhoto(updated);
    setEditingPhoto(false);
    setSavingEdit(false);
    toast.success(t('photoUpdated'));
  }, [selectedPhoto, editCaption, editTags]);

  const activeFilterCount = [searchQuery, dateFrom, dateTo, tagFilter, planSetFilter].filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('gallery')}</h1>
          <p className="text-sm text-muted-foreground">
            {filteredPhotos.length !== photos.length
              ? t('photoCountFiltered', { filtered: filteredPhotos.length, total: photos.length })
              : t('photoCount', { count: filteredPhotos.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {t('filter')}
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
            onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="photo-camera"
            onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }}
          />
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => document.getElementById('photo-camera')?.click()} loading={uploading}>
                <Camera className="mr-2 h-4 w-4" />
                {t('takePhoto')}
              </Button>
              <Button onClick={() => document.getElementById('photo-upload')?.click()} loading={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? t('uploading') : t('uploadPhotos')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="mb-4 space-y-3 rounded-lg border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
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
              placeholder={t('dateFrom')}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-auto"
              placeholder={t('dateTo')}
            />
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">{t('allTags')}</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {allPlanSets.length > 0 && (
              <select
                value={planSetFilter}
                onChange={(e) => setPlanSetFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">{t('allPlanSets')}</option>
                {allPlanSets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8" onClick={handleClearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                {tCommon('cancel')}
              </Button>
            )}
          </div>
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">{photos.length === 0 ? t('noPhotos') : t('noPhotosFiltered')}</p>
          {photos.length === 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{t('noPhotosHint')}</p>
              {canCreate && (
                <Button onClick={() => document.getElementById('photo-upload')?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('uploadPhotos')}
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              {t('clearFilters')}
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
              <div className="relative aspect-square bg-muted">
                <Image
                  src={photo.thumbnail_url || photo.file_url}
                  alt={photo.caption || t('photoAlt')}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>
              <div className="p-2">
                <div className="mb-1 flex items-center gap-1">
                  {photo.sheet_name && (
                    <>
                      <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 truncate">{photo.sheet_name}</span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{formatDate(photo.taken_at || photo.created_at)}</span>
                </div>
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
      <Dialog open={!!selectedPhoto} onClose={() => { setSelectedPhoto(null); setEditingPhoto(false); }} className="max-w-4xl lg:max-w-7xl lg:overflow-hidden lg:p-0 lg:max-h-[85vh]">
        {selectedPhoto && (
          <>
            <DialogHeader className="lg:px-6 lg:pt-6 lg:pb-2">
              <div className="flex items-center gap-2">
                <DialogTitle className="flex-1">{selectedPhoto.caption || t('photo')}</DialogTitle>
                {!editingPhoto && (
                  <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {tCommon('edit')}
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-4 lg:space-y-0 lg:flex lg:flex-row lg:flex-1 lg:min-h-0">
              {/* Left column: photo + edit form */}
              <div className="lg:flex-1 lg:min-w-0 lg:overflow-y-auto lg:p-6 lg:pt-2">
                {selectedPhoto.type === 'photo_360' ? (
                  <Photo360Viewer imageUrl={selectedPhoto.file_url} />
                ) : (
                  <img
                    src={selectedPhoto.file_url}
                    alt={selectedPhoto.caption || ''}
                    className="max-h-[60vh] lg:max-h-[75vh] w-full rounded object-contain"
                  />
                )}

                {editingPhoto && (
                  <div className="mt-4 space-y-3 rounded-lg border bg-muted/50 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium">{t('captionLabel')}</label>
                      <Input
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder={t('captionPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">{t('tagsLabel')}</label>
                      <TagPicker
                        tags={editTags}
                        onChange={setEditTags}
                        suggestions={allTags}
                        placeholder={t('newTagPlaceholder')}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingPhoto(false)}>{tCommon('cancel')}</Button>
                      <Button size="sm" onClick={handleSaveEdit} loading={savingEdit}>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {savingEdit ? tCommon('saving') : tCommon('save')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar: annotation preview + metadata + comments */}
              {!editingPhoto && (
                <div className="space-y-4 lg:w-[360px] lg:shrink-0 lg:border-l lg:overflow-y-auto lg:p-4">
                  {selectedPhoto.sheet_id && selectedPhoto.annotation_id && selectedPhoto.annotation_type && selectedPhoto.annotation_data ? (
                    <AnnotationPlanPreview
                      projectId={projectId}
                      sheetId={selectedPhoto.sheet_id}
                      sheetName={selectedPhoto.sheet_name || ''}
                      annotationId={selectedPhoto.annotation_id}
                      annotationType={selectedPhoto.annotation_type}
                      annotationData={selectedPhoto.annotation_data}
                      thumbnailUrl={selectedPhoto.sheet_version_thumbnail_url ?? null}
                      sheetWidth={selectedPhoto.sheet_version_width ?? null}
                      sheetHeight={selectedPhoto.sheet_version_height ?? null}
                      sheetVersionId={selectedPhoto.sheet_version_id}
                      planSetName={selectedPhoto.plan_set_name}
                      onNavigate={() => setSelectedPhoto(null)}
                    />
                  ) : selectedPhoto.sheet_id && selectedPhoto.annotation_id ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      {selectedPhoto.sheet_name && (
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{selectedPhoto.sheet_name}</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(`/project/${projectId}/plans?sheet=${selectedPhoto.sheet_id}&annotation=${selectedPhoto.annotation_id}`);
                          setSelectedPhoto(null);
                        }}
                      >
                        <MapPin className="mr-1 h-3.5 w-3.5" />
                        {t('showOnPlan')}
                      </Button>
                    </div>
                  ) : selectedPhoto.sheet_name ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{selectedPhoto.sheet_name}</span>
                    </div>
                  ) : null}
                  <div className="space-y-2 text-sm text-muted-foreground lg:space-y-2">
                    <div className="flex items-center gap-2">
                      <span>{formatDate(selectedPhoto.created_at)}</span>
                      {selectedPhoto.tags && selectedPhoto.tags.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <a href={selectedPhoto.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          {tCommon('download')}
                        </Button>
                      </a>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedPhoto)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {tCommon('delete')}
                      </Button>
                    </div>
                  </div>

                  {/* Comments section */}
                  <div className="rounded-lg border">
                    <button
                      className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50"
                      onClick={() => setShowComments(!showComments)}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {t('comments')}
                        {photoComments.length > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                            {photoComments.length}
                          </Badge>
                        )}
                      </div>
                      {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showComments && (
                      <div className="border-t">
                        <div className="max-h-60 space-y-2 overflow-auto p-3">
                          {photoComments.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground">{t('noComments')}</p>
                          )}
                          {photoComments.map((comment) => {
                            const displayName = comment.user_name || comment.user_email || comment.user_id?.slice(0, 8) || t('anonymousUser');
                            return (
                              <div key={comment.id} className="flex gap-2">
                                <Avatar name={displayName} size="sm" />
                                <div className="flex-1 rounded-lg bg-muted p-2">
                                  <div className="mb-0.5 flex items-center gap-2">
                                    <span className="text-xs font-medium">{displayName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm">{comment.body}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={commentBottomRef} />
                        </div>
                        <form onSubmit={handleSendPhotoComment} className="flex gap-2 border-t p-3">
                          <Input
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                            placeholder={t('commentPlaceholder')}
                            className="flex-1"
                          />
                          <Button type="submit" size="icon" disabled={sendingComment || !commentBody.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
