'use client';

import { useEffect, useState, useCallback } from 'react';
import { syncQueue, getQueuedActions } from './index';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending actions
    getQueuedActions().then((actions) => setPendingActions(actions.length));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncQueue();
      const remaining = await getQueuedActions();
      setPendingActions(remaining.length);
      return result;
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return { isOnline, pendingActions, syncing, sync: handleSync };
}
