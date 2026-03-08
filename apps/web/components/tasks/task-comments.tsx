'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@joubuild/shared';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Comment {
  id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

export function TaskComments({ taskId, readOnly = false }: { taskId: string; readOnly?: boolean }) {
  const t = useTranslations('tasks');
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (data) setComments(data);
    }

    load();

    // Realtime subscription
    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        (payload: { new: Comment }) => {
          setComments(prev => {
            if (prev.some(c => c.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: user?.id,
        body: body.trim(),
      });

    if (error) {
      toast.error(error.message);
    }

    setBody('');
    setLoading(false);
  }

  async function handleEdit(commentId: string) {
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
  }

  async function handleDelete(commentId: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{t('comments.title')}</h4>

      <div className="mb-3 max-h-64 space-y-3 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('comments.empty')}</p>
        )}
        {comments.map((comment) => {
          const isOwn = comment.user_id === currentUserId;
          const displayName = comment.user_name || comment.user_email || comment.user_id?.slice(0, 8) || t('comments.anonymous');

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
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(comment.id); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(comment.id)}>
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
              {isOwn && !readOnly && editingId !== comment.id && (
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
                    onClick={() => handleDelete(comment.id)}
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

      {!readOnly && (
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('comments.placeholder')}
            className="flex-1"
          />
          <Button type="submit" size="icon" loading={loading} disabled={!body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
