import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { OrgRole } from '@joubuild/shared';
import { getInitials } from '@joubuild/shared';
import { getOrganizationMembers } from '@joubuild/supabase';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/providers/org-provider';
import { useOrgRole } from '@/hooks/use-org-role';
import { useInvitations } from '@/hooks/use-invitations';

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  email: string;
  full_name: string | null;
}

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export default function OrganizationMembersScreen() {
  const { t } = useTranslation();
  const { currentOrgId } = useOrg();
  const { canManageMembers } = useOrgRole();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [inviting, setInviting] = useState(false);

  const {
    invitations,
    fetchInvitations,
    inviteMember,
    cancelInvitation,
    resendInvitation,
  } = useInvitations(currentOrgId);

  const fetchMembers = useCallback(async () => {
    if (!currentOrgId) {
      setLoading(false);
      return;
    }

    const { data: memberData } = await getOrganizationMembers(
      supabase,
      currentOrgId
    );

    if (!memberData || memberData.length === 0) {
      setMembers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Fetch profiles separately (same pattern as web app)
    const userIds = memberData.map((m) => m.user_id);
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const profileMap = new Map(
      ((profiles as any[]) ?? []).map((p: any) => [p.id, p])
    );

    const rows: MemberRow[] = memberData.map((m) => {
      const profile = profileMap.get(m.user_id) as any;
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role as OrgRole,
        email: profile?.email ?? '',
        full_name: profile?.full_name ?? null,
      };
    });

    setMembers(rows);
    setLoading(false);
    setRefreshing(false);
  }, [currentOrgId]);

  useEffect(() => {
    fetchMembers();
    if (canManageMembers) {
      fetchInvitations();
    }
  }, [fetchMembers, canManageMembers, fetchInvitations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
    if (canManageMembers) {
      fetchInvitations();
    }
  }, [fetchMembers, canManageMembers, fetchInvitations]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const result = await inviteMember(inviteEmail.trim(), inviteRole);
    setInviting(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    if (result.directlyAdded) {
      Alert.alert('Success', 'User added to organization');
      fetchMembers();
    } else {
      Alert.alert('Success', 'Invitation sent');
    }

    setInviteEmail('');
    setInviteRole('member');
    setShowInviteModal(false);
  };

  const handleCancelInvitation = (invId: string, email: string) => {
    Alert.alert(
      'Cancel invitation',
      `Cancel invitation for ${email}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelInvitation(invId);
            if (result.error) Alert.alert('Error', result.error);
          },
        },
      ]
    );
  };

  const handleResendInvitation = async (invId: string) => {
    const result = await resendInvitation(invId);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Invitation resent');
    }
  };

  const roleKey = (role: OrgRole) =>
    `org.roles.${role}` as const;

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <Stack.Screen options={{ title: t('org.members') }} />
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-950">
      <Stack.Screen
        options={{
          title: t('org.members'),
          headerRight: canManageMembers
            ? () => (
                <Pressable
                  onPress={() => setShowInviteModal(true)}
                  className="mr-2 px-3 py-1.5 bg-blue-600 rounded-lg"
                >
                  <Text className="text-white text-sm font-medium">
                    Invite
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListHeaderComponent={
          canManageMembers && invitations.length > 0 ? (
            <View className="mb-4">
              <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Pending Invitations
              </Text>
              {invitations.map((inv) => (
                <View
                  key={inv.id}
                  className="flex-row items-center bg-neutral-900/50 border border-dashed border-neutral-700 rounded-xl p-4 mb-2"
                >
                  <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center mr-3">
                    <Text className="text-amber-400 font-semibold text-lg">
                      @
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">{inv.email}</Text>
                    <Text className="text-neutral-500 text-xs">
                      {t(roleKey(inv.role))} — {new Date(inv.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable
                      onPress={() => handleResendInvitation(inv.id)}
                      className="px-2 py-1 bg-neutral-800 rounded-md mr-1"
                    >
                      <Text className="text-neutral-300 text-xs">Resend</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleCancelInvitation(inv.id, inv.email)}
                      className="px-2 py-1 bg-red-900/30 rounded-md"
                    >
                      <Text className="text-red-400 text-xs">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mt-4 mb-2">
                Members
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-neutral-400 text-base">
              {t('org.noMembers')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const initials = getInitials(
            item.full_name ?? item.email
          );
          return (
            <View className="flex-row items-center bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3">
              <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center mr-3">
                <Text className="text-blue-400 font-semibold text-sm">
                  {initials}
                </Text>
              </View>
              <View className="flex-1">
                {item.full_name && (
                  <Text className="text-white font-medium">
                    {item.full_name}
                  </Text>
                )}
                <Text className="text-neutral-400 text-sm">
                  {item.email}
                </Text>
              </View>
              <View className="bg-neutral-800 px-2 py-1 rounded-md">
                <Text className="text-neutral-300 text-xs">
                  {t(roleKey(item.role))}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View className="flex-1 bg-neutral-950 p-6">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-white text-xl font-bold">Invite Member</Text>
            <Pressable onPress={() => setShowInviteModal(false)}>
              <Text className="text-blue-400 text-base">Cancel</Text>
            </Pressable>
          </View>

          <View className="mb-4">
            <Text className="text-neutral-400 text-sm mb-2">Email</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@example.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="mb-6">
            <Text className="text-neutral-400 text-sm mb-2">Role</Text>
            <View className="flex-row gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setInviteRole(opt.value)}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    inviteRole === opt.value
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-neutral-900 border-neutral-700'
                  }`}
                >
                  <Text
                    className={
                      inviteRole === opt.value
                        ? 'text-blue-400 font-semibold'
                        : 'text-neutral-300'
                    }
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className={`py-4 rounded-xl items-center ${
              inviting || !inviteEmail.trim()
                ? 'bg-blue-600/30'
                : 'bg-blue-600'
            }`}
          >
            <Text className="text-white font-semibold text-base">
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
