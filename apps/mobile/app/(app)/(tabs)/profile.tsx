import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/auth-provider';
import { useOrgRole } from '@/hooks/use-org-role';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { canManageMembers } = useOrgRole();

  return (
    <View className="flex-1 bg-neutral-950 px-6 pt-8">
      <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3">
        <Text className="text-neutral-400 text-sm mb-1">{t('profile.email')}</Text>
        <Text className="text-white text-base">{user?.email}</Text>
      </View>

      <TouchableOpacity
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
        onPress={() => router.push('/(app)/profile-edit' as any)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <Ionicons name="create-outline" size={20} color="#a3a3a3" />
          <Text className="text-white text-base ml-3">{t('profileEdit.title')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#525252" />
      </TouchableOpacity>

      {canManageMembers && (
        <>
          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
            onPress={() => router.push('/(app)/organization/members' as any)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={20} color="#a3a3a3" />
              <Text className="text-white text-base ml-3">{t('org.members')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#525252" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
            onPress={() => router.push('/(app)/organization/settings' as any)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="business-outline" size={20} color="#a3a3a3" />
              <Text className="text-white text-base ml-3">{t('orgSettings.title')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#525252" />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 flex-row items-center justify-between"
        onPress={() => router.push('/(app)/settings' as any)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <Ionicons name="settings-outline" size={20} color="#a3a3a3" />
          <Text className="text-white text-base ml-3">{t('settings.title')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#525252" />
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-red-500/10 border border-red-500/30 rounded-xl py-3 items-center"
        onPress={signOut}
      >
        <Text className="text-red-400 font-semibold">{t('auth.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}
