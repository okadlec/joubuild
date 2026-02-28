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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    const supabase = getSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Load comments for this annotation with user profiles
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles:user_id(full_name, email)')
        .eq('annotation_id', annotationId)
        .order('created_at', { ascending: true });
      if (commentsData) {
        setComments(commentsData.map((c: Record<string, unknown>) => {
          const profile = c.profiles as Record<string, unknown> | null;
          return {
            ...c,
            user_name: profile?.full_name as string | null,
            user_email: profile?.email as string | null,
          } as Comment;
        }));
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
    }
    setBody('');
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
          annotation_id: annotationId,
          file_url: urlData.publicUrl,
          type: 'photo',
          taken_by: user?.id,
        })
        .select('id, file_url, thumbnail_url, caption, created_at')
        .single();

      if (!error && data) {
        setPhotos(prev => [data, ...prev]);
      }
    }

    setUploading(false);
    toast.success('Fotky nahrány');
  }, [projectId, annotationId]);

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
    <div className="flex h-full w-80 flex-col border-l bg-background">
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
                      <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Napište komentář..."
                className="flex-1"
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
            <div className="mb-3">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="annotation-photo-upload"
                onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => document.getElementById('annotation-photo-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Nahrávání...' : 'Nahrát fotku'}
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
