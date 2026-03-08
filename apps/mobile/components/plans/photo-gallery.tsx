import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { createPhoto } from '@joubuild/supabase';
import { STORAGE_BUCKETS } from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';

interface PhotoGalleryProps {
  photos: any[];
  projectId: string;
  annotationId: string;
  onPhotoAdded: () => void;
}

export function PhotoGallery({
  photos,
  projectId,
  annotationId,
  onPhotoAdded,
}: PhotoGalleryProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(projectId);
  const canAddPhotos = hasPermission('photos', 'can_create');
  const [uploading, setUploading] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await uploadPhoto(asset);
  };

  const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.PHOTOS)
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.PHOTOS)
        .getPublicUrl(fileName);

      await createPhoto(supabase, {
        project_id: projectId,
        annotation_id: annotationId,
        file_url: urlData.publicUrl,
        type: 'photo',
        taken_by: user?.id ?? null,
        width: asset.width,
        height: asset.height,
      });

      onPhotoAdded();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setUploading(false);
    }
  };

  const showAddMenu = () => {
    Alert.alert(t('plans.addPhoto'), undefined, [
      { text: t('plans.takePhoto'), onPress: () => pickImage(true) },
      { text: t('plans.chooseFromGallery'), onPress: () => pickImage(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View className="flex-1">
      {photos.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <Ionicons name="images-outline" size={48} color="#525252" />
          <Text className="text-neutral-500 mt-2">{t('plans.noPhotos')}</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-1 aspect-square m-1 rounded-lg overflow-hidden"
              onPress={() => setLightboxUri(item.file_url)}
            >
              <Image
                source={{ uri: item.thumbnail_url ?? item.file_url }}
                className="w-full h-full"
              />
            </TouchableOpacity>
          )}
        />
      )}

      {canAddPhotos && (
        <TouchableOpacity
          className="absolute bottom-4 right-4 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={showAddMenu}
          disabled={uploading}
        >
          <Ionicons
            name={uploading ? 'hourglass' : 'add'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      )}

      <Modal visible={!!lightboxUri} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/90 items-center justify-center"
          activeOpacity={1}
          onPress={() => setLightboxUri(null)}
        >
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={{
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').height * 0.8,
              }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
