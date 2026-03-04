'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { FolderPermission } from '@joubuild/shared';

interface UseFolderPermissionsResult {
  folderPermissions: FolderPermission[];
  loading: boolean;
  canViewFolder: (folderId: string) => boolean;
  canCreateInFolder: (folderId: string) => boolean;
  canDeleteInFolder: (folderId: string) => boolean;
}

export function useFolderPermissions(projectId: string): UseFolderPermissionsResult {
  const [folderPermissions, setFolderPermissions] = useState<FolderPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('folder_permissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (data) setFolderPermissions(data as FolderPermission[]);
      setLoading(false);
    }
    load();
  }, [projectId]);

  // If no row exists for a folder → module-level permissions apply (allow).
  // If a row exists → it restricts access.
  const canViewFolder = useCallback(
    (folderId: string): boolean => {
      const perm = folderPermissions.find(p => p.folder_id === folderId);
      if (!perm) return true;
      return perm.can_view;
    },
    [folderPermissions]
  );

  const canCreateInFolder = useCallback(
    (folderId: string): boolean => {
      const perm = folderPermissions.find(p => p.folder_id === folderId);
      if (!perm) return true;
      return perm.can_create;
    },
    [folderPermissions]
  );

  const canDeleteInFolder = useCallback(
    (folderId: string): boolean => {
      const perm = folderPermissions.find(p => p.folder_id === folderId);
      if (!perm) return true;
      return perm.can_delete;
    },
    [folderPermissions]
  );

  return { folderPermissions, loading, canViewFolder, canCreateInFolder, canDeleteInFolder };
}
