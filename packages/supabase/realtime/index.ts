import type { TypedSupabaseClient } from '../client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to task changes in a project.
 */
export function subscribeToProjectTasks(
  client: TypedSupabaseClient,
  projectId: string,
  callback: (payload: { eventType: string; new: unknown; old: unknown }) => void
): RealtimeChannel {
  return client
    .channel(`project-tasks-${projectId}`)
    .on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      },
      (payload: unknown) => callback(payload as { eventType: string; new: unknown; old: unknown })
    )
    .subscribe();
}

/**
 * Subscribe to comments on a task for real-time chat.
 */
export function subscribeToTaskComments(
  client: TypedSupabaseClient,
  taskId: string,
  callback: (payload: { eventType: string; new: unknown; old: unknown }) => void
): RealtimeChannel {
  return client
    .channel(`task-comments-${taskId}`)
    .on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `task_id=eq.${taskId}`,
      },
      (payload: unknown) => callback(payload as { eventType: string; new: unknown; old: unknown })
    )
    .subscribe();
}

/**
 * Subscribe to user notifications.
 */
export function subscribeToNotifications(
  client: TypedSupabaseClient,
  userId: string,
  callback: (payload: { eventType: string; new: unknown }) => void
): RealtimeChannel {
  return client
    .channel(`user-notifications-${userId}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: unknown) => callback(payload as { eventType: string; new: unknown })
    )
    .subscribe();
}
