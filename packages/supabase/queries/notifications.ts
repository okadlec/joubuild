import type { TypedSupabaseClient } from '../client';

export function getNotifications(client: TypedSupabaseClient, userId: string) {
  return client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export function markNotificationRead(
  client: TypedSupabaseClient,
  id: string
) {
  return client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
}

export function markAllNotificationsRead(
  client: TypedSupabaseClient,
  userId: string
) {
  return client
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export function getUnreadNotificationCount(
  client: TypedSupabaseClient,
  userId: string
) {
  return client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}
