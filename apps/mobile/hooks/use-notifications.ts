import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '@joubuild/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Notification } from '@joubuild/shared';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [notifRes, countRes] = await Promise.all([
      getNotifications(supabase, user.id),
      getUnreadNotificationCount(supabase, user.id),
    ]);

    if (notifRes.error) console.error('useNotifications error:', notifRes.error);
    setNotifications((notifRes.data as Notification[]) ?? []);
    setUnreadCount(countRes.count ?? 0);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const markRead = useCallback(
    async (notificationId: string) => {
      await markNotificationRead(supabase, notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(supabase, user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    onRefresh,
    markRead,
    markAllRead,
    refetch: fetchData,
  };
}
