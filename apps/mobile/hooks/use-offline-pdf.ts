import { useCallback, useEffect, useState } from 'react';
import { File, Directory, Paths } from 'expo-file-system';

interface UseOfflinePdfResult {
  localUri: string | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  download: () => Promise<void>;
}

export function useOfflinePdf(
  fileUrl: string,
  sheetId: string,
  version: number
): UseOfflinePdfResult {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileName = `${sheetId}_v${version}.pdf`;
  const cacheDir = new Directory(Paths.cache, 'plans');
  const cachedFile = new File(cacheDir, fileName);

  useEffect(() => {
    if (cachedFile.exists) {
      setLocalUri(cachedFile.uri);
    }
  }, [cachedFile.uri]);

  const download = useCallback(async () => {
    if (downloading || !fileUrl) return;

    if (cachedFile.exists) {
      setLocalUri(cachedFile.uri);
      return;
    }

    setDownloading(true);
    setProgress(0);
    setError(null);

    try {
      if (!cacheDir.exists) {
        cacheDir.create();
      }

      const result = await File.downloadFileAsync(fileUrl, cachedFile);
      setLocalUri(result.uri);
      setProgress(1);
    } catch (e: any) {
      setError(e.message ?? 'Download failed');
    } finally {
      setDownloading(false);
    }
  }, [fileUrl, cachedFile.uri, downloading]);

  return { localUri, downloading, progress, error, download };
}
