'use client';

import { PermissionsProvider } from '@/lib/contexts/permissions-context';

export function ProjectShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  return (
    <PermissionsProvider projectId={projectId}>
      {children}
    </PermissionsProvider>
  );
}
