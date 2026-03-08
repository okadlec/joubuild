import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { updateProject, deleteProject } from '@joubuild/supabase';
import { useProject } from '@/hooks/use-project';
import { useCoverImage } from '@/hooks/use-cover-image';
import { StatusPicker } from '@/components/projects/status-picker';
import { CoverImagePicker } from '@/components/projects/cover-image-picker';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { project, loading } = useProject(id!);
  const { pickAndUpload, uploading } = useCoverImage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setAddress(project.address ?? '');
      setStatus(project.status);
      setCoverImageUrl(project.cover_image_url);
    }
  }, [project]);

  const handlePickCover = async () => {
    const url = await pickAndUpload(id!);
    if (url) setCoverImageUrl(url);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('project.namePlaceholder'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateProject(supabase, id!, {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        status,
        cover_image_url: coverImageUrl,
      });
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t('project.deleteConfirmTitle'), t('project.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('project.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProject(supabase, id!);
            router.replace('/(app)/(tabs)');
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('project.edit'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView className="flex-1 bg-neutral-950 px-4 pt-4">
        <CoverImagePicker
          imageUrl={coverImageUrl}
          onPick={handlePickCover}
          uploading={uploading}
        />

        <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <Text className="text-neutral-400 text-xs uppercase mb-2">{t('project.name')}</Text>
          <TextInput
            className="text-white text-base"
            placeholderTextColor="#525252"
            placeholder={t('project.namePlaceholder')}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <Text className="text-neutral-400 text-xs uppercase mb-2">
            {t('project.description')}
          </Text>
          <TextInput
            className="text-white text-base"
            placeholderTextColor="#525252"
            placeholder={t('project.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <Text className="text-neutral-400 text-xs uppercase mb-2">{t('project.address')}</Text>
          <TextInput
            className="text-white text-base"
            placeholderTextColor="#525252"
            placeholder={t('project.addressPlaceholder')}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <Text className="text-neutral-400 text-xs uppercase mb-2">{t('project.status')}</Text>
          <StatusPicker value={status} onChange={setStatus} />
        </View>

        <TouchableOpacity
          className="bg-blue-500 rounded-xl p-4 items-center mb-4"
          onPress={handleSave}
          disabled={saving || uploading}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">{t('common.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-red-500/30 rounded-xl p-4 items-center mb-8"
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Text className="text-red-400 font-semibold text-base">{t('project.delete')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
