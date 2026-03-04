'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@joubuild/shared';
import { toast } from 'sonner';

interface Comment {
  id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

interface AnnotationChatPanelProps {
  annotationId: string;
  projectId: string;
}

export function AnnotationChatPanel({ annotationId }: AnnotationChatPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('annotation_id', annotationId)
        .order('created_at', { ascending: true });

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map((c: { user_id: string | null }) => c.user_id).filter(Boolean))] as string[];
        let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
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
      } else {
        setComments([]);
      }
    }

    load();

    const channel = supabase
      .channel(`ann-comments-${annotationId}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `annotation_id=eq.${annotationId}` },
        async (payload: { new: Comment }) => {
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

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

  return (
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
        />
        <Button type="submit" size="icon" disabled={sending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
