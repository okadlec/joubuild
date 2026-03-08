import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DownloadProgressProps {
  progress: number;
}

export function DownloadProgress({ progress }: DownloadProgressProps) {
  const { t } = useTranslation();
  const percent = Math.round(progress * 100);

  return (
    <View className="flex-1 bg-neutral-950 items-center justify-center px-8">
      <Text className="text-white text-lg mb-4">{t('plans.downloading')}</Text>
      <View className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
        <View
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </View>
      <Text className="text-neutral-400 text-sm mt-2">{percent}%</Text>
    </View>
  );
}
