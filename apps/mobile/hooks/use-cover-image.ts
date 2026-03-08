import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS } from '@joubuild/shared';

export function useCoverImage() {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(
    async (projectId: string): Promise<string | null> => {
      return new Promise((resolve) => {
        Alert.alert(t('project.coverImage'), undefined, [
          {
            text: t('project.takePhoto'),
            onPress: () => doPickAndUpload(projectId, true).then(resolve),
          },
          {
            text: t('project.chooseFromGallery'),
            onPress: () => doPickAndUpload(projectId, false).then(resolve),
          },
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
        ]);
      });
    },
    [t]
  );

  const doPickAndUpload = async (
    projectId: string,
    useCamera: boolean
  ): Promise<string | null> => {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (result.canceled || !result.assets[0]) return null;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${projectId}/cover-${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.PHOTOS)
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.PHOTOS)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading };
}
