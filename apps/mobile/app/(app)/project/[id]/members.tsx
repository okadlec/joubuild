import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PROJECT_ROLES } from '@joubuild/shared';
import {
  useProjectMembers,
  type MemberWithProfile,
  type ProfileResult,
} from '@/hooks/use-project-members';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { members, loading, addMember, updateRole, removeMember, searchProfiles } =
    useProjectMembers(id!);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const results = await searchProfiles(query);
      const memberIds = new Set(members.map((m) => m.user_id));
      setSearchResults(results.filter((r) => !memberIds.has(r.id)));
      setSearching(false);
    },
    [searchProfiles, members]
  );

  const handleAddMember = (profile: ProfileResult) => {
    Alert.alert(
      t('members.changeRole'),
      profile.email ?? profile.full_name ?? '',
      PROJECT_ROLES.map((role) => ({
        text: t(`members.role.${role}`),
        onPress: async () => {
          try {
            await addMember(profile.id, role);
            setAddModalVisible(false);
            setSearchQuery('');
            setSearchResults([]);
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      }))
    );
  };

  const handleMemberAction = (member: MemberWithProfile) => {
    Alert.alert(
      member.full_name ?? member.email ?? member.user_id,
      undefined,
      [
        {
          text: t('members.changeRole'),
          onPress: () => showRolePicker(member),
        },
        {
          text: t('members.removeMember'),
          style: 'destructive',
          onPress: () => confirmRemove(member),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const showRolePicker = (member: MemberWithProfile) => {
    Alert.alert(
      t('members.changeRole'),
      undefined,
      PROJECT_ROLES.map((role) => ({
        text: t(`members.role.${role}`),
        onPress: async () => {
          try {
            await updateRole(member.user_id, role);
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      }))
    );
  };

  const confirmRemove = (member: MemberWithProfile) => {
    Alert.alert(t('members.removeMember'), t('members.removeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('members.removeMember'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(member.user_id);
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  const getInitials = (member: MemberWithProfile) => {
    if (member.full_name) {
      return member.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (member.email ?? '?')[0].toUpperCase();
  };

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-blue-500/20 text-blue-400',
    member: 'bg-green-500/20 text-green-400',
    follower: 'bg-neutral-500/20 text-neutral-400',
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
          title: t('members.title'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-neutral-950">
        <FlatList
          data={members}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#525252" />
              <Text className="text-neutral-400 mt-2">{t('members.noMembers')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const roleColor = ROLE_COLORS[item.role] ?? ROLE_COLORS.member;
            const [roleBg, roleText] = roleColor.split(' ');
            return (
              <TouchableOpacity
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center"
                onPress={() => handleMemberAction(item)}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center mr-3">
                  <Text className="text-blue-400 font-semibold">{getInitials(item)}</Text>
                </View>
                <View className="flex-1">
                  {item.full_name && (
                    <Text className="text-white font-medium">{item.full_name}</Text>
                  )}
                  <Text className="text-neutral-400 text-sm">{item.email ?? item.user_id}</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full ${roleBg}`}>
                  <Text className={`text-xs font-medium ${roleText}`}>
                    {t(`members.role.${item.role}`, { defaultValue: item.role })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <TouchableOpacity
          className="absolute bottom-6 right-4 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>

        <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-neutral-950">
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <Text className="text-white text-lg font-semibold">{t('members.addMember')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddModalVisible(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View className="px-4 mb-4">
              <TextInput
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white"
                placeholderTextColor="#525252"
                placeholder={t('members.searchByEmail')}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
            </View>

            {searching ? (
              <ActivityIndicator color="#3B82F6" className="mt-4" />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-2"
                    onPress={() => handleAddMember(item)}
                    activeOpacity={0.7}
                  >
                    {item.full_name && (
                      <Text className="text-white font-medium">{item.full_name}</Text>
                    )}
                    <Text className="text-neutral-400 text-sm">{item.email}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Modal>
      </View>
    </>
  );
}
