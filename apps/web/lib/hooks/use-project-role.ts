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
  isOrgAdmin: boolean;
  canEdit: boolean;
  canManage: boolean;
}

export function useProjectRole(projectId: string): UseProjectRoleResult {
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

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
        .maybeSingle();

      if (data) {
        setRole(data.role as ProjectRole);
        setLoading(false);
        return;
      }

      // Fallback: check if user is org admin/owner
      const { data: project } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single();

      if (project?.organization_id) {
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', project.organization_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (orgMember?.role === 'owner' || orgMember?.role === 'admin') {
          setRole('admin');
          setIsOrgAdmin(true);
        }
      }

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
    isOrgAdmin,
    canEdit: role === 'admin' || role === 'member',
    canManage: role === 'admin',
  };
}
