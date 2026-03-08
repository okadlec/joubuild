import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@joubuild/supabase';

export interface MemberWithProfile {
  user_id: string;
  role: string;
  email: string | null;
  full_name: string | null;
}

export interface ProfileResult {
  id: string;
  email: string | null;
  full_name: string | null;
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const { data: membersData, error } = await getProjectMembers(supabase, projectId);
    if (error) {
      console.error('getProjectMembers error:', error);
      setLoading(false);
      return;
    }

    if (!membersData || membersData.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userIds = membersData.map((m) => m.user_id).filter((id) => UUID_RE.test(id));

    if (userIds.length === 0) {
      setMembers(
        membersData.map((m) => ({ user_id: m.user_id, role: m.role, email: null, full_name: null }))
      );
      setLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('profiles query error:', profilesError);
    }

    const profileMap = new Map(
      (profiles ?? []).map((p: ProfileResult) => [p.id, p])
    );

    setMembers(
      membersData.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        email: profileMap.get(m.user_id)?.email ?? null,
        full_name: profileMap.get(m.user_id)?.full_name ?? null,
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMember = useCallback(
    async (userId: string, role: string) => {
      const { error } = await addProjectMember(supabase, {
        project_id: projectId,
        user_id: userId,
        role,
      });
      if (error) throw error;
      await refresh();
    },
    [projectId, refresh]
  );

  const updateRole = useCallback(
    async (userId: string, role: string) => {
      const { error } = await updateProjectMemberRole(supabase, projectId, userId, role);
      if (error) throw error;
      await refresh();
    },
    [projectId, refresh]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      const { error } = await removeProjectMember(supabase, projectId, userId);
      if (error) throw error;
      await refresh();
    },
    [projectId, refresh]
  );

  const searchProfiles = useCallback(
    async (query: string): Promise<ProfileResult[]> => {
      if (query.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${query}%`)
        .limit(10);
      return data ?? [];
    },
    []
  );

  return { members, loading, refresh, addMember, updateRole, removeMember, searchProfiles };
}
