import type { ReactNode } from 'react';
import type { PermissionModule, PermissionAction } from '@joubuild/shared';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  projectId: string;
  module: PermissionModule;
  action?: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  projectId,
  module,
  action = 'can_view',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions(projectId);

  if (loading) return null;

  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
