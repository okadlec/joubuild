'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@joubuild/shared';
import type { Notification } from '@joubuild/shared';

const NOTIFICATION_ICONS: Record<string, string> = {
  mention: '@',
  task_assigned: '👤',
  status_changed: '🔄',
  comment_added: '💬',
  due_date_approaching: '⏰',
};

export function NotificationsPanel() {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    loadNotifications();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: { new: Notification }) => {
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function loadNotifications() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setNotifications(data as Notification[]);
  }

  async function markAsRead(id: string) {
    const supabase = getSupabaseClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        className="relative rounded-md p-2 hover:bg-accent"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-sm font-semibold">{t('title')}</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="mr-1 h-3 w-3" />
                {t('markAll')}
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('empty')}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex cursor-pointer gap-3 border-b p-3 transition-colors hover:bg-muted/50 ${
                    !notif.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                    {NOTIFICATION_ICONS[notif.type] || '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.is_read ? 'font-medium' : ''}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{notif.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
