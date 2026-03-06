'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { PermissionModule, PermissionAction, ProjectMemberPermission } from '@joubuild/shared';

interface UsePermissionsResult {
  permissions: ProjectMemberPermission[];
  loading: boolean;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  getModulePermissions: (module: PermissionModule) => ProjectMemberPermission | undefined;
}

export function usePermissions(projectId: string): UsePermissionsResult {
  const [permissions, setPermissions] = useState<ProjectMemberPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (data) setPermissions(data as ProjectMemberPermission[]);
      setLoading(false);
    }
    load();
  }, [projectId]);

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      const perm = permissions.find(p => p.module === module);
      if (!perm) return false; // no row = default deny (secure by default)
      return perm[action];
    },
    [permissions]
  );

  const getModulePermissions = useCallback(
    (module: PermissionModule) => permissions.find(p => p.module === module),
    [permissions]
  );

  return { permissions, loading, hasPermission, getModulePermissions };
}
