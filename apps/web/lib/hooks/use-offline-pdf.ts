'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  downloadPdfForOffline,
  removeOfflinePdf,
  isSheetAvailableOffline,
} from '@/lib/offline/pdf-offline';

export function useOfflinePdf(sheetId: string, name: string, fileUrl: string) {
  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    isSheetAvailableOffline(sheetId).then(setIsOffline);
  }, [sheetId]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadPdfForOffline({ id: sheetId, name, fileUrl });
      setIsOffline(true);
    } catch (err) {
      console.error('Failed to download PDF for offline use:', err);
      throw err;
    } finally {
      setDownloading(false);
    }
  }, [sheetId, name, fileUrl]);

  const remove = useCallback(async () => {
    await removeOfflinePdf(sheetId);
    setIsOffline(false);
  }, [sheetId]);

  return { isOffline, downloading, download, remove };
}
