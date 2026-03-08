import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { createProject, addProjectMember } from '@joubuild/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useCoverImage } from '@/hooks/use-cover-image';
import { StatusPicker } from '@/components/projects/status-picker';
import { CoverImagePicker } from '@/components/projects/cover-image-picker';

export default function CreateProjectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { pickAndUpload, uploading } = useCoverImage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePickCover = async () => {
    const tempId = `temp-${Date.now()}`;
    const url = await pickAndUpload(tempId);
    if (url) setCoverImageUrl(url);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('project.namePlaceholder'));
      return;
    }

    setSaving(true);
    try {
      const { data: orgMembership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user!.id)
        .limit(1)
        .single();

      if (!orgMembership) {
        Alert.alert(t('common.error'), 'No organization found');
        setSaving(false);
        return;
      }

      const { data: project, error } = await createProject(supabase, {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        status,
        cover_image_url: coverImageUrl,
        organization_id: orgMembership.organization_id,
      });

      if (error) throw error;

      await addProjectMember(supabase, {
        project_id: project.id,
        user_id: user!.id,
        role: 'admin',
      });

      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('projects.createTitle'),
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
          className="bg-blue-500 rounded-xl p-4 items-center mb-8"
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
      </ScrollView>
    </>
  );
}
