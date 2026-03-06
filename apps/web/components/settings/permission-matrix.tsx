'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  PROJECT_ROLE_LABELS,
} from '@joubuild/shared';
import type { ProjectMemberPermission, FolderPermission, PermissionModule } from '@joubuild/shared';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete'] as const;

export function PermissionMatrix({
  projectId,
  members,
  initialPermissions,
  initialFolderPermissions,
  folders,
}: {
  projectId: string;
  members: Member[];
  initialPermissions: ProjectMemberPermission[];
  initialFolderPermissions: FolderPermission[];
  folders: Folder[];
}) {
  const t = useTranslations('permissions');
  const tCommon = useTranslations('common');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ProjectMemberPermission[]>(initialPermissions);
  const [folderPerms, setFolderPerms] = useState<FolderPermission[]>(initialFolderPermissions);
  const [saving, setSaving] = useState(false);

  const selectedMember = members.find(m => m.user_id === selectedUserId);

  // Get permissions for selected user
  const userModulePerms = PERMISSION_MODULES.map(mod => {
    const existing = permissions.find(
      p => p.user_id === selectedUserId && p.module === mod
    );
    return {
      module: mod as PermissionModule,
      can_view: existing?.can_view ?? true,
      can_create: existing?.can_create ?? true,
      can_edit: existing?.can_edit ?? true,
      can_delete: existing?.can_delete ?? false,
    };
  });

  function toggleModulePerm(module: PermissionModule, action: typeof ACTIONS[number]) {
    setPermissions(prev => {
      const idx = prev.findIndex(
        p => p.user_id === selectedUserId && p.module === module
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [action]: !updated[idx][action as keyof ProjectMemberPermission] };
        return updated;
      }
      // Create new entry
      return [
        ...prev,
        {
          id: '',
          project_id: projectId,
          user_id: selectedUserId!,
          module,
          can_view: action === 'can_view' ? false : true,
          can_create: action === 'can_create' ? false : true,
          can_edit: action === 'can_edit' ? false : true,
          can_delete: action === 'can_delete' ? true : false,
        },
      ];
    });
  }

  // Folder permissions for selected user
  const userFolderPerms = folders.map(folder => {
    const existing = folderPerms.find(
      fp => fp.user_id === selectedUserId && fp.folder_id === folder.id
    );
    return {
      folder_id: folder.id,
      folder_name: folder.name,
      can_view: existing?.can_view ?? true,
      can_create: existing?.can_create ?? true,
      can_delete: existing?.can_delete ?? false,
      hasOverride: !!existing,
    };
  });

  function toggleFolderPerm(folderId: string, action: 'can_view' | 'can_create' | 'can_delete') {
    setFolderPerms(prev => {
      const idx = prev.findIndex(
        fp => fp.user_id === selectedUserId && fp.folder_id === folderId
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [action]: !updated[idx][action as keyof FolderPermission] };
        return updated;
      }
      return [
        ...prev,
        {
          id: '',
          project_id: projectId,
          user_id: selectedUserId!,
          folder_id: folderId,
          can_view: action === 'can_view' ? false : true,
          can_create: action === 'can_create' ? false : true,
          can_delete: action === 'can_delete' ? true : false,
        },
      ];
    });
  }

  async function handleSave() {
    if (!selectedUserId) return;
    setSaving(true);
    const supabase = getSupabaseClient();

    // Upsert module permissions
    const moduleRows = PERMISSION_MODULES.map(mod => {
      const p = permissions.find(
        pp => pp.user_id === selectedUserId && pp.module === mod
      );
      return {
        project_id: projectId,
        user_id: selectedUserId,
        module: mod,
        can_view: p?.can_view ?? true,
        can_create: p?.can_create ?? true,
        can_edit: p?.can_edit ?? true,
        can_delete: p?.can_delete ?? false,
      };
    });

    const { error: modError } = await supabase
      .from('project_member_permissions')
      .upsert(moduleRows, { onConflict: 'project_id,user_id,module' });

    if (modError) {
      toast.error(modError.message);
      setSaving(false);
      return;
    }

    // Upsert folder permissions (only ones with overrides)
    const folderRows = folderPerms.filter(fp => fp.user_id === selectedUserId);
    if (folderRows.length > 0) {
      const { error: fpError } = await supabase
        .from('folder_permissions')
        .upsert(
          folderRows.map(fp => ({
            project_id: projectId,
            user_id: selectedUserId,
            folder_id: fp.folder_id,
            can_view: fp.can_view,
            can_create: fp.can_create,
            can_delete: fp.can_delete,
          })),
          { onConflict: 'project_id,user_id,folder_id' }
        );

      if (fpError) {
        toast.error(fpError.message);
        setSaving(false);
        return;
      }
    }

    toast.success(t('permissionsSaved'));
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('selectUser')}</p>
          <div className="space-y-1">
            {members.map(member => (
              <button
                key={member.user_id}
                onClick={() => setSelectedUserId(member.user_id)}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors ${
                  selectedUserId === member.user_id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={member.full_name || member.email || '?'} size="sm" />
                  <div>
                    <p className="text-sm font-medium">
                      {member.full_name || member.email || member.user_id?.slice(0, 8) ?? '?'}
                    </p>
                    {member.full_name && member.email && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">
                  {PROJECT_ROLE_LABELS[member.role] || member.role}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {selectedUserId && selectedMember && (
          <>
            {/* Module permissions matrix */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">
                {t('modulePermissions', { name: selectedMember.full_name || selectedMember.email || '' })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-4 text-left font-medium">{t('moduleColumn')}</th>
                      {ACTIONS.map(a => (
                        <th key={a} className="px-3 py-2 text-center font-medium">
                          {PERMISSION_ACTION_LABELS[a]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userModulePerms.map(row => (
                      <tr key={row.module} className="border-b">
                        <td className="py-2 pr-4">{PERMISSION_MODULE_LABELS[row.module]}</td>
                        {ACTIONS.map(action => (
                          <td key={action} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row[action]}
                              onChange={() => toggleModulePerm(row.module, action)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Folder permissions */}
            {folders.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">{t('folderPermissions')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('folderPermissionsHint')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-medium">{t('folderColumn')}</th>
                        <th className="px-3 py-2 text-center font-medium">{t('viewColumn')}</th>
                        <th className="px-3 py-2 text-center font-medium">{t('createColumn')}</th>
                        <th className="px-3 py-2 text-center font-medium">{t('deleteColumn')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userFolderPerms.map(row => (
                        <tr key={row.folder_id} className="border-b">
                          <td className="py-2 pr-4">{row.folder_name}</td>
                          {(['can_view', 'can_create', 'can_delete'] as const).map(action => (
                            <td key={action} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={row[action]}
                                onChange={() => toggleFolderPerm(row.folder_id, action)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? tCommon('saving') : t('savePermissions')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
