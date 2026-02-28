// Offline Sync Engine - Core Logic
// Manages a queue of mutations for offline-first operations

export interface SyncAction {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

export interface SyncEngine {
  enqueue(action: Omit<SyncAction, 'id' | 'timestamp' | 'synced'>): void;
  flush(): Promise<SyncAction[]>;
  getPending(): SyncAction[];
  clear(): void;
}

/**
 * Create a simple in-memory sync engine.
 * In production, back this with IndexedDB (web) or SQLite (mobile).
 */
export function createSyncEngine(): SyncEngine {
  let queue: SyncAction[] = [];
  let counter = 0;

  return {
    enqueue(action) {
      queue.push({
        ...action,
        id: `sync-${++counter}-${Date.now()}`,
        timestamp: Date.now(),
        synced: false,
      });
    },

    async flush() {
      const pending = queue.filter((a) => !a.synced);
      // Mark all as synced (caller handles actual server sync)
      for (const action of pending) {
        action.synced = true;
      }
      return pending;
    },

    getPending() {
      return queue.filter((a) => !a.synced);
    },

    clear() {
      queue = [];
    },
  };
}
