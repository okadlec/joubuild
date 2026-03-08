import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { OrgRole } from '@joubuild/shared';
import { getInitials } from '@joubuild/shared';
import { getOrganizationMembers } from '@joubuild/supabase';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/providers/org-provider';

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  email: string;
  full_name: string | null;
}

export default function OrganizationMembersScreen() {
  const { t } = useTranslation();
  const { currentOrgId } = useOrg();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  }, [fetchMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [fetchMembers]);

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
      <Stack.Screen options={{ title: t('org.members') }} />
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
    </View>
  );
}
