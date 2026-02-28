'use client';

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, pendingActions, syncing, sync } = useOnlineStatus();

  if (isOnline && pendingActions === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium',
        isOnline ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
      )}
    >
      {isOnline ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}

      {!isOnline && <span>Offline</span>}

      {pendingActions > 0 && (
        <>
          <span>{pendingActions} čekajících změn</span>
          {isOnline && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => sync()}
              disabled={syncing}
            >
              <RefreshCw className={cn('h-3 w-3', syncing && 'animate-spin')} />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
