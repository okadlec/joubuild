import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface CoverImagePickerProps {
  imageUrl: string | null;
  onPick: () => void;
  uploading: boolean;
}

export function CoverImagePicker({ imageUrl, onPick, uploading }: CoverImagePickerProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-4"
      onPress={onPick}
      activeOpacity={0.7}
      disabled={uploading}
    >
      {imageUrl ? (
        <View>
          <Image source={{ uri: imageUrl }} className="w-full h-48" resizeMode="cover" />
          <View className="absolute bottom-0 left-0 right-0 bg-black/50 py-2 px-3 flex-row items-center justify-center">
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color="#fff" />
                <Text className="text-white text-sm ml-1">
                  {t('project.changeCoverImage')}
                </Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <View className="h-32 items-center justify-center">
          {uploading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#525252" />
              <Text className="text-neutral-500 mt-2">{t('project.addCoverImage')}</Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
