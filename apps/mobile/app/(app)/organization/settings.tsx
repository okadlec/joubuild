import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS } from '@joubuild/shared';
import { useOrg } from '@/providers/org-provider';

export default function OrganizationSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentOrg, currentOrgId, refresh: refreshOrg } = useOrg();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name ?? '');
      setLogoUrl(currentOrg.logo_url ?? null);
    }
  }, [currentOrg]);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${currentOrgId}/logo-${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleSave = async () => {
    if (!currentOrgId || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: name.trim(), logo_url: logoUrl })
        .eq('id', currentOrgId);

      if (error) throw error;

      await refreshOrg();
      Alert.alert(t('orgSettings.saved'));
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
          title: t('orgSettings.title'),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !name.trim()}
              style={{ opacity: saving || !name.trim() ? 0.5 : 1 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className="text-blue-500 font-semibold">
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-neutral-950 px-6 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickLogo}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                className="w-20 h-20 rounded-xl"
              />
            ) : (
              <View className="w-20 h-20 rounded-xl bg-neutral-800 items-center justify-center">
                <Ionicons name="business" size={32} color="#737373" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-500 items-center justify-center">
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('orgSettings.name')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
          placeholder={t('orgSettings.namePlaceholder')}
          placeholderTextColor="#737373"
          value={name}
          onChangeText={setName}
        />
      </ScrollView>
    </>
  );
}
