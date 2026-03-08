'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { usePermissionsContext } from '@/lib/contexts/permissions-context';
import type { PermissionModule, PermissionAction, ProjectMemberPermission } from '@joubuild/shared';

interface UsePermissionsResult {
  permissions: ProjectMemberPermission[];
  loading: boolean;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  getModulePermissions: (module: PermissionModule) => ProjectMemberPermission | undefined;
}

export function usePermissions(projectId: string): UsePermissionsResult {
  const ctx = usePermissionsContext();
  const hasContext = ctx !== null;

  const [permissions, setPermissions] = useState<ProjectMemberPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasContext) return;

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
  }, [projectId, hasContext]);

  const resolvedPermissions = hasContext ? ctx.permissions : permissions;
  const resolvedLoading = hasContext ? ctx.loading : loading;

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      if (hasContext) return ctx.hasPermission(module, action);
      const perm = resolvedPermissions.find(p => p.module === module);
      if (!perm) return false;
      return perm[action];
    },
    [resolvedPermissions, hasContext, ctx]
  );

  const getModulePermissions = useCallback(
    (module: PermissionModule) => resolvedPermissions.find(p => p.module === module),
    [resolvedPermissions]
  );

  return { permissions: resolvedPermissions, loading: resolvedLoading, hasPermission, getModulePermissions };
}
