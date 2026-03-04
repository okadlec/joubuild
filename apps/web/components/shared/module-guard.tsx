'use client';

import { usePermissions } from '@/lib/hooks/use-permissions';
import { ShieldX } from 'lucide-react';
import type { PermissionModule, PermissionAction } from '@joubuild/shared';

interface ModuleGuardProps {
  projectId: string;
  module: PermissionModule;
  action?: PermissionAction;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function ModuleGuard({
  projectId,
  module,
  action = 'can_view',
  fallback,
  children,
}: ModuleGuardProps) {
  const { hasPermission, loading } = usePermissions(projectId);

  if (loading) return null;

  if (!hasPermission(module, action)) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldX className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">Přístup odepřen</p>
        <p className="text-sm">Nemáte oprávnění k tomuto modulu</p>
      </div>
    );
  }

  return <>{children}</>;
}
