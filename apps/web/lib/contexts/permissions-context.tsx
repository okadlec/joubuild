'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { PermissionModule, PermissionAction, ProjectMemberPermission } from '@joubuild/shared';

interface PermissionsContextValue {
  permissions: ProjectMemberPermission[];
  loading: boolean;
  isSuperadmin: boolean;
  isOrgAdmin: boolean;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  getModulePermissions: (module: PermissionModule) => ProjectMemberPermission | undefined;
}

export const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<ProjectMemberPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Permissions] No user found');
        setLoading(false);
        return;
      }

      console.log('[Permissions] Loading for user:', user.id, 'project:', projectId);

      // Check if user is superadmin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.is_superadmin) {
        console.log('[Permissions] Superadmin detected — granting full access');
        setIsSuperadmin(true);
        setLoading(false);
        return;
      }

      // Check if user is org admin/owner for this project's organization
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
          console.log('[Permissions] Org admin detected — granting full access');
          setIsOrgAdmin(true);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      console.log('[Permissions] Query result:', { data, error });

      if (data) setPermissions(data as ProjectMemberPermission[]);
      setLoading(false);
    }
    load();
  }, [projectId]);

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      if (isSuperadmin || isOrgAdmin) return true;
      const perm = permissions.find(p => p.module === module);
      if (!perm) return false;
      return perm[action];
    },
    [permissions, isSuperadmin, isOrgAdmin]
  );

  const getModulePermissions = useCallback(
    (module: PermissionModule) => permissions.find(p => p.module === module),
    [permissions]
  );

  return (
    <PermissionsContext.Provider value={{ permissions, loading, isSuperadmin, isOrgAdmin, hasPermission, getModulePermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  return useContext(PermissionsContext);
}
