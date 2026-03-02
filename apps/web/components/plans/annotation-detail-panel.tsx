'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, Camera, CheckSquare, Send, Upload, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatRelativeTime, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@joubuild/shared';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { compressImage } from '@/lib/compress-image';

type Tab = 'chat' | 'photos' | 'task';

interface Comment {
  id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

interface Photo {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  created_at: string;
}

interface LinkedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee_id: string | null;
}

interface AnnotationDetailPanelProps {
  annotationId: string;
  projectId: string;
  sheetVersionId: string;
  onClose: () => void;
}

export function AnnotationDetailPanel({
  annotationId,
  projectId,
  sheetVersionId,
  onClose,
}: AnnotationDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [comments, setComments] = useState<Comment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [linkedTask, setLinkedTask] = useState<LinkedTask | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editPhotoCaption, setEditPhotoCaption] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isMobile = useIsMobile();

  // Track keyboard height to adjust panel position
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    // On native Capacitor: use @capacitor/keyboard plugin for reliable events
    if (window.Capacitor?.isNativePlatform()) {
      let cleanup: (() => void) | undefined;

      import('@capacitor/keyboard').then(({ Keyboard }) => {
        const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight);
        });
        const hideListener = Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });

        cleanup = () => {
          showListener.then(h => h.remove());
          hideListener.then(h => h.remove());
        };
      }).catch(() => {
        // Keyboard plugin not available, ignore
      });

      return () => {
        cleanup?.();
      };
    }

    // Fallback for browser: use visualViewport
    const vv = window.visualViewport;
    if (!vv) return;

    function handleResize() {
      const vv = window.visualViewport;
      if (!vv) return;
      const kbHeight = window.innerHeight - vv.height;
      setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
    }

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Scroll input into view when keyboard appears
  useEffect(() => {
    if (keyboardHeight > 0 && inputRef.current) {
      setTimeout(() => inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
    }
  }, [keyboardHeight]);

  // Load data
  useEffect(() => {
    const supabase = getSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Load comments for this annotation, then fetch profiles separately
      // (embedded join profiles:user_id fails when FK resolves through auth.users)
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('annotation_id', annotationId)
        .order('created_at', { ascending: true });
      if (commentsError) {
        console.error('Failed to load comments:', commentsError);
      }
      if (commentsData && commentsData.length > 0) {
        // Fetch profiles for unique user_ids
        const userIds = [...new Set(commentsData.map((c: { user_id: string | null }) => c.user_id).filter(Boolean))] as string[];
        let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          if (profilesError) {
            console.error('Failed to load profiles:', profilesError);
          }
          if (profiles) {
            profileMap = Object.fromEntries(profiles.map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p]));
          }
        }
        setComments(commentsData.map((c: Record<string, unknown>) => {
          const profile = c.user_id ? profileMap[c.user_id as string] : null;
          return {
            ...c,
            user_name: profile?.full_name ?? null,
            user_email: profile?.email ?? null,
          } as Comment;
        }));
      } else if (commentsData) {
        setComments([]);
      }

      // Load photos for this annotation
      const { data: photosData } = await supabase
        .from('photos')
        .select('id, file_url, thumbnail_url, caption, created_at')
        .eq('annotation_id', annotationId)
        .order('created_at', { ascending: false });
      if (photosData) setPhotos(photosData);

      // Load linked task
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, status, priority, assignee_id')
        .eq('annotation_id', annotationId)
        .limit(1)
        .maybeSingle();
      if (taskData) setLinkedTask(taskData);
    }

    load();

    // Realtime for comments — fetch profile for new comments
    const channel = supabase
      .channel(`ann-comments-${annotationId}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `annotation_id=eq.${annotationId}` },
        async (payload: { new: Comment }) => {
          // Fetch profile for the new comment
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
          setComments(prev => {
            if (prev.some(c => c.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [annotationId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length, activeTab]);

  const handleSendComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('comments').insert({
      annotation_id: annotationId,
      user_id: user?.id,
      body: body.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      setBody('');
    }
    setSending(false);
  }, [annotationId, body]);

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!editBody.trim()) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('comments')
      .update({ body: editBody.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) {
      toast.error(error.message);
      return;
    }
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, body: editBody.trim() } : c));
    setEditingId(null);
    setEditBody('');
  }, [editBody]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setComments(prev => prev.filter(c => c.id !== commentId));
  }, []);

  const handlePhotoUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    let successCount = 0;

    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      const fileName = `${projectId}/${Date.now()}-${file.name.replace(/\.[^.]+$/, '.jpg')}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, compressed, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error(`Chyba při nahrávání ${file.name}: ${uploadError.message}`);
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
        console.error('Photo insert error:', error);
        toast.error(`Chyba při ukládání ${file.name}: ${error.message}`);
      } else if (data) {
        setPhotos(prev => [data, ...prev]);
        successCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'fotka nahrána' : 'fotek nahráno'}`);
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

  const handleCreateTask = useCallback(async () => {
    const title = prompt('Název úkolu:');
    if (!title?.trim()) return;

    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        annotation_id: annotationId,
        title: title.trim(),
        created_by: user?.id,
      })
      .select('id, title, status, priority, assignee_id')
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkedTask(data);
    toast.success('Úkol vytvořen');
  }, [projectId, annotationId]);

  const tabs = [
    { id: 'chat' as Tab, label: 'Chat', icon: MessageSquare, count: comments.length },
    { id: 'photos' as Tab, label: 'Fotky', icon: Camera, count: photos.length },
    { id: 'task' as Tab, label: 'Úkol', icon: CheckSquare, count: linkedTask ? 1 : 0 },
  ];

  return (
    <div
      ref={panelRef}
      className={cn(
        'flex flex-col bg-background',
        isMobile
          ? 'fixed inset-x-0 z-50 rounded-t-xl border-t shadow-lg'
          : 'h-full w-80 border-l'
      )}
      style={isMobile ? {
        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
        maxHeight: keyboardHeight > 0 ? `calc(70vh - ${keyboardHeight}px)` : '70vh',
      } : undefined}
    >
      {/* Drag handle for mobile */}
      {isMobile && (
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Detail anotace</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-auto p-3">
              {comments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Zatím žádné komentáře</p>
              )}
              {comments.map((comment) => {
                const isOwn = comment.user_id === currentUserId;
                const displayName = comment.user_name || comment.user_email || comment.user_id?.slice(0, 8) || 'Uživatel';

                return (
                  <div key={comment.id} className="group flex gap-2">
                    <Avatar name={displayName} size="sm" />
                    <div className="flex-1 rounded-lg bg-muted p-2">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-xs font-medium">{displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      {editingId === comment.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="h-7 flex-1 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditComment(comment.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditComment(comment.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm">{comment.body}</p>
                      )}
                    </div>
                    {isOwn && editingId !== comment.id && (
                      <div className="flex flex-col gap-0.5 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSendComment} className="flex gap-2 border-t p-3">
              <Input
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Napište komentář..."
                className="flex-1"
                onFocus={() => {
                  if (isMobile) {
                    setTimeout(() => inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={sending || !body.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="p-3">
            <div className="mb-3 flex gap-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                id="annotation-photo-camera"
                onChange={(e) => { if (e.target.files) handlePhotoUpload(e.target.files); e.target.value = ''; }}
              />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="annotation-photo-gallery"
                onChange={(e) => { if (e.target.files) handlePhotoUpload(e.target.files); e.target.value = ''; }}
              />
              <Button
                size="sm"
                className="flex-1"
                onClick={() => document.getElementById('annotation-photo-camera')?.click()}
                disabled={uploading}
              >
                <Camera className="mr-1 h-4 w-4" />
                Vyfotit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('annotation-photo-gallery')?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1 h-4 w-4" />
                Z galerie
              </Button>
            </div>

            {photos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Žádné fotky</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="overflow-hidden rounded-md border">
                    <img
                      src={photo.thumbnail_url || photo.file_url}
                      alt={photo.caption || 'Fotka'}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-1">
                      {editingPhotoId === photo.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={editPhotoCaption}
                            onChange={(e) => setEditPhotoCaption(e.target.value)}
                            className="h-6 flex-1 text-xs"
                            placeholder="Popis..."
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
                      ) : (
                        <button
                          className="w-full truncate text-left text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingPhotoId(photo.id); setEditPhotoCaption(photo.caption || ''); }}
                        >
                          {photo.caption || 'Přidat popis...'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task Tab */}
        {activeTab === 'task' && (
          <div className="p-3">
            {linkedTask ? (
              <div className="space-y-3">
                <div className="rounded-md border p-3">
                  <h4 className="text-sm font-medium">{linkedTask.title}</h4>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">
                      {TASK_STATUS_LABELS[linkedTask.status] || linkedTask.status}
                    </Badge>
                    <Badge variant="secondary">
                      {TASK_PRIORITY_LABELS[linkedTask.priority] || linkedTask.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-3 text-sm text-muted-foreground">Žádný propojený úkol</p>
                <Button size="sm" onClick={handleCreateTask}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Vytvořit úkol
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
