'use client';

import type { ProjectRole } from '@joubuild/shared';

interface RbacGuardProps {
  role: ProjectRole | null;
  allowedRoles: ProjectRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RbacGuard({ role, allowedRoles, children, fallback = null }: RbacGuardProps) {
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
