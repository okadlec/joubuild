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
import { getProfile, updateProfile } from '@joubuild/supabase';
import { STORAGE_BUCKETS } from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await getProfile(supabase, user.id);
      if (data) {
        setFullName(data.full_name ?? '');
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const pickAvatar = async () => {
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
      const fileName = `${user!.id}/avatar-${Date.now()}.${ext}`;

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

      setAvatarUrl(urlData.publicUrl);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfile(supabase, user.id, {
        full_name: fullName.trim() || undefined,
        avatar_url: avatarUrl ?? undefined,
      });

      // Change password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          Alert.alert(t('common.error'), t('auth.passwordsNoMatch'));
          setSaving(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
      }

      Alert.alert(t('profileEdit.saved'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('profileEdit.title'),
            headerStyle: { backgroundColor: '#171717' },
            headerTintColor: '#fff',
            headerShown: true,
          }}
        />
        <View className="flex-1 bg-neutral-950 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('profileEdit.title'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.5 : 1 }}
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
        {/* Avatar */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickAvatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-neutral-800 items-center justify-center">
                <Ionicons name="person" size={40} color="#737373" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 items-center justify-center">
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('profileEdit.name')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
          placeholder={t('profileEdit.namePlaceholder')}
          placeholderTextColor="#737373"
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Email (read-only) */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('profile.email')}
        </Text>
        <View className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 mb-6">
          <Text className="text-neutral-400">{user?.email}</Text>
        </View>

        {/* Change password */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('profileEdit.newPassword')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
          placeholder={t('profileEdit.newPasswordPlaceholder')}
          placeholderTextColor="#737373"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('profileEdit.confirmPassword')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-8"
          placeholder={t('profileEdit.confirmPasswordPlaceholder')}
          placeholderTextColor="#737373"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </ScrollView>
    </>
  );
}
