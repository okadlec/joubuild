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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { createPhoto } from '@joubuild/supabase';
import { STORAGE_BUCKETS } from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectPhotos } from '@/hooks/use-project-photos';
import { formatDate } from '@/lib/format';

export default function PhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(id!);
  const canAdd = hasPermission('photos', 'can_create');
  const { photos, loading, refreshing, onRefresh, refetch } = useProjectPhotos(id!);

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
    await uploadPhoto(result.assets[0]);
  };

  const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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

      await createPhoto(supabase, {
        project_id: id!,
        file_url: urlData.publicUrl,
        type: 'photo',
        taken_by: user?.id ?? null,
        width: asset.width,
        height: asset.height,
      });

      refetch();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setUploading(false);
    }
  };

  const showAddMenu = () => {
    Alert.alert(t('photos.addPhoto'), undefined, [
      { text: t('photos.takePhoto'), onPress: () => pickImage(true) },
      { text: t('photos.chooseFromGallery'), onPress: () => pickImage(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('photos.title') }} />
      <View className="flex-1 bg-neutral-950">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : photos.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="images-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">{t('photos.noPhotos')}</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 4, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-1 aspect-square m-1 rounded-lg overflow-hidden"
                onPress={() => setLightboxUri(item.file_url)}
              >
                <Image
                  source={{ uri: item.thumbnail_url ?? item.file_url }}
                  className="w-full h-full"
                />
                {item.caption && (
                  <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <Text className="text-white text-xs" numberOfLines={1}>
                      {item.caption}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {canAdd && (
          <TouchableOpacity
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 items-center justify-center"
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={showAddMenu}
            disabled={uploading}
          >
            <Ionicons
              name={uploading ? 'hourglass' : 'camera'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {/* Lightbox */}
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
    </>
  );
}
