'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ProjectRole } from '@joubuild/shared';

interface UseProjectRoleResult {
  role: ProjectRole | null;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isFollower: boolean;
  canEdit: boolean;
  canManage: boolean;
}

export function useProjectRole(projectId: string): UseProjectRoleResult {
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (data) setRole(data.role as ProjectRole);
      setLoading(false);
    }
    loadRole();
  }, [projectId]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isMember: role === 'member' || role === 'admin',
    isFollower: role === 'follower',
    canEdit: role === 'admin' || role === 'member',
    canManage: role === 'admin',
  };
}
