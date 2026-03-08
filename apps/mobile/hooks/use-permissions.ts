import { useCallback } from 'react';
import type { PermissionModule, PermissionAction } from '@joubuild/shared';
import { can } from '@joubuild/shared';
import { useOrg } from '@/providers/org-provider';
import { useProjectRole } from './use-project-role';

export function usePermissions(projectId: string) {
  const { orgRole } = useOrg();
  const { role: projectRole, loading } = useProjectRole(projectId);

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction = 'can_view') => {
      return can({ orgRole, projectRole }, module, action);
    },
    [orgRole, projectRole]
  );

  return {
    hasPermission,
    loading,
  };
}
