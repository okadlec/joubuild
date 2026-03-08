import { useCallback, useEffect, useState } from 'react';
import type { ProjectRole } from '@joubuild/shared';
import { getProjectMemberRole } from '@joubuild/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function useProjectRole(projectId: string) {
  const { user } = useAuth();
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }
    const { data, error } = await getProjectMemberRole(
      supabase,
      projectId,
      user.id
    );
    if (error) {
      // User is not a project member
      setRole(null);
    } else {
      setRole(data.role as ProjectRole);
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isMember: role === 'member',
    isFollower: role === 'follower',
    canEdit: role === 'admin' || role === 'member',
    canManage: role === 'admin',
  };
}
