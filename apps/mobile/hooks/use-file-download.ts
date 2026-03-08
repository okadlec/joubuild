import { useCallback, useEffect, useState } from 'react';
import { File, Directory, Paths } from 'expo-file-system';

interface UseFileDownloadResult {
  localUri: string | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  download: (fileUrl: string, docId: string, ext: string) => Promise<void>;
}

export function useFileDownload(): UseFileDownloadResult {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cacheDir = new Directory(Paths.cache, 'documents');

  const download = useCallback(
    async (fileUrl: string, docId: string, ext: string) => {
      if (downloading) return;

      const fileName = `${docId}.${ext}`;
      const cachedFile = new File(cacheDir, fileName);

      if (cachedFile.exists) {
        setLocalUri(cachedFile.uri);
        setProgress(1);
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
    },
    [downloading]
  );

  return { localUri, downloading, progress, error, download };
}
