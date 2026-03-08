import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

interface UploadProgressProps {
  visible: boolean;
}

export function UploadProgress({ visible }: UploadProgressProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center">
        <View className="bg-neutral-900 border border-neutral-700 rounded-2xl px-8 py-6 items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-white mt-3">{t('documents.uploading')}</Text>
        </View>
      </View>
    </Modal>
  );
}
