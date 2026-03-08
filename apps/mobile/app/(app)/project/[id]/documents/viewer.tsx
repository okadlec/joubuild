import { useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFileDownload } from '@/hooks/use-file-download';
import { DownloadProgress } from '@/components/plans/download-progress';
import { PdfViewer } from '@/components/plans/pdf-viewer';

export default function DocumentViewerScreen() {
  const { fileUrl, name } = useLocalSearchParams<{
    fileUrl: string;
    name: string;
  }>();
  const router = useRouter();
  const { localUri, downloading, progress, error, download } =
    useFileDownload();

  useEffect(() => {
    if (fileUrl) {
      const ext = (name ?? 'file').split('.').pop() ?? 'pdf';
      // Use a hash of the URL as a stable doc ID for caching
      const docId = fileUrl!.split('/').pop()?.split('?')[0] ?? 'doc';
      download(fileUrl!, docId, ext);
    }
  }, [fileUrl]);

  if (downloading || !localUri) {
    return (
      <View className="flex-1 bg-neutral-950">
        <View className="flex-row items-center px-4 pt-14 pb-3 bg-neutral-900">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-medium flex-1" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <DownloadProgress progress={progress} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="flex-row items-center px-4 pt-14 pb-3 bg-neutral-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-medium flex-1" numberOfLines={1}>
          {name}
        </Text>
      </View>
      <PdfViewer uri={localUri} />
    </View>
  );
}
