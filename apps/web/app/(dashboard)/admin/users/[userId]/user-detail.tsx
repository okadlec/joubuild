'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Save, Plus, Trash2, FolderOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  PROJECT_ROLE_LABELS,
  getDefaultPermissionsForRole,
} from '@joubuild/shared';
import type {
  ProjectRole,
  ProjectMemberPermission,
  FolderPermission,
  PermissionModule,
} from '@joubuild/shared';
import {
  updateProjectMemberRole,
  updateUserProjectPermissions,
  updateUserFolderPermissions,
  addUserToProject,
  removeUserFromProject,
} from './actions';

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete'] as const;

const PROJECT_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  archived: 'outline',
};

interface MemberProject {
  project_id: string;
  role: string;
  name: string;
  status: string;
  organization_id: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  project_id: string;
}

interface UserDetailProps {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    is_superadmin: boolean;
    created_at: string;
  };
  orgMembership: {
    role: string;
    organization_id: string;
    org_name: string | null;
  } | null;
  memberProjects: MemberProject[];
  permissions: ProjectMemberPermission[];
  folderPermissions: FolderPermission[];
  folders: Folder[];
  availableProjects: { id: string; name: string }[];
}

export function UserDetail({
  profile,
  orgMembership,
  memberProjects: initialProjects,
  permissions: initialPermissions,
  folderPermissions: initialFolderPerms,
  folders,
  availableProjects: initialAvailable,
}: UserDetailProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tRoles = useTranslations('roles');
  const tProjects = useTranslations('projects');

  const [projects, setProjects] = useState(initialProjects);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [folderPerms, setFolderPerms] = useState(initialFolderPerms);
  const [availableProjects, setAvailableProjects] = useState(initialAvailable);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addProjectId, setAddProjectId] = useState('');
  const [addProjectRole, setAddProjectRole] = useState<ProjectRole>('member');

  const selectedProject = projects.find((p) => p.project_id === selectedProjectId);

  // Get module permissions for selected project
  const userModulePerms = selectedProjectId
    ? PERMISSION_MODULES.map((mod) => {
        const existing = permissions.find(
          (p) => p.project_id === selectedProjectId && p.module === mod
        );
        return {
          module: mod as PermissionModule,
          can_view: existing?.can_view ?? true,
          can_create: existing?.can_create ?? true,
          can_edit: existing?.can_edit ?? true,
          can_delete: existing?.can_delete ?? false,
        };
      })
    : [];

  // Get folder permissions for selected project
  const projectFolders = folders.filter((f) => f.project_id === selectedProjectId);
  const userFolderPerms = projectFolders.map((folder) => {
    const existing = folderPerms.find(
      (fp) => fp.folder_id === folder.id && fp.user_id === profile.id
    );
    return {
      folder_id: folder.id,
      folder_name: folder.name,
      can_view: existing?.can_view ?? true,
      can_create: existing?.can_create ?? true,
      can_delete: existing?.can_delete ?? false,
    };
  });

  function toggleModulePerm(module: PermissionModule, action: typeof ACTIONS[number]) {
    if (!selectedProjectId) return;
    setPermissions((prev) => {
      const idx = prev.findIndex(
        (p) => p.project_id === selectedProjectId && p.module === module
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [action]: !updated[idx][action as keyof ProjectMemberPermission] };
        return updated;
      }
      return [
        ...prev,
        {
          id: '',
          project_id: selectedProjectId,
          user_id: profile.id,
          module,
          can_view: action === 'can_view' ? false : true,
          can_create: action === 'can_create' ? false : true,
          can_edit: action === 'can_edit' ? false : true,
          can_delete: action === 'can_delete' ? true : false,
        },
      ];
    });
  }

  function toggleFolderPerm(folderId: string, action: 'can_view' | 'can_create' | 'can_delete') {
    if (!selectedProjectId) return;
    setFolderPerms((prev) => {
      const idx = prev.findIndex(
        (fp) => fp.user_id === profile.id && fp.folder_id === folderId
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
          project_id: selectedProjectId,
          user_id: profile.id,
          folder_id: folderId,
          can_view: action === 'can_view' ? false : true,
          can_create: action === 'can_create' ? false : true,
          can_delete: action === 'can_delete' ? true : false,
        },
      ];
    });
  }

  const isOrgViewer = orgMembership?.role === 'viewer';
  const isFollower = selectedProject?.role === 'follower';
  const isPermissionsLocked = isOrgViewer || isFollower;

  async function handleRoleChange(projectId: string, newRole: ProjectRole) {
    const result = await updateProjectMemberRole(profile.id, projectId, newRole);
    if (result.error) { toast.error(result.error); return; }
    setProjects((prev) =>
      prev.map((p) => (p.project_id === projectId ? { ...p, role: newRole } : p))
    );

    // Auto-set permissions to match new role defaults
    const defaults = getDefaultPermissionsForRole(newRole);
    const newPerms = PERMISSION_MODULES.map(mod => ({
      id: '',
      project_id: projectId,
      user_id: profile.id,
      module: mod as PermissionModule,
      ...defaults,
    }));
    setPermissions(prev => {
      const withoutProject = prev.filter(p => p.project_id !== projectId);
      return [...withoutProject, ...newPerms];
    });

    // Also persist the new defaults
    const moduleRows = PERMISSION_MODULES.map(mod => ({
      module: mod,
      ...defaults,
    }));
    await updateUserProjectPermissions(profile.id, projectId, moduleRows);

    toast.success(t('userDetail.roleUpdated'));
  }

  async function handleSavePermissions() {
    if (!selectedProjectId) return;
    setSaving(true);

    const moduleRows = PERMISSION_MODULES.map((mod) => {
      const p = permissions.find(
        (pp) => pp.project_id === selectedProjectId && pp.module === mod
      );
      return {
        module: mod,
        can_view: p?.can_view ?? true,
        can_create: p?.can_create ?? true,
        can_edit: p?.can_edit ?? true,
        can_delete: p?.can_delete ?? false,
      };
    });

    const result = await updateUserProjectPermissions(profile.id, selectedProjectId, moduleRows);
    if (result.error) {
      toast.error(result.error);
      setSaving(false);
      return;
    }

    // Save folder permissions if any
    const projectFolderPerms = folderPerms.filter(
      (fp) => fp.user_id === profile.id && fp.project_id === selectedProjectId
    );
    if (projectFolderPerms.length > 0) {
      const fpResult = await updateUserFolderPermissions(
        profile.id,
        selectedProjectId,
        projectFolderPerms.map((fp) => ({
          folder_id: fp.folder_id,
          can_view: fp.can_view,
          can_create: fp.can_create,
          can_delete: fp.can_delete,
        }))
      );
      if (fpResult.error) {
        toast.error(fpResult.error);
        setSaving(false);
        return;
      }
    }

    toast.success(t('userDetail.permissionsSaved'));
    setSaving(false);
  }

  async function handleAddToProject() {
    if (!addProjectId) return;
    const result = await addUserToProject(profile.id, addProjectId, addProjectRole);
    if (result.error) { toast.error(result.error); return; }

    const addedProject = availableProjects.find((p) => p.id === addProjectId);
    if (addedProject) {
      setProjects((prev) => [
        ...prev,
        {
          project_id: addedProject.id,
          role: addProjectRole,
          name: addedProject.name,
          status: 'active',
          organization_id: '',
        },
      ]);
      setAvailableProjects((prev) => prev.filter((p) => p.id !== addProjectId));
    }

    toast.success(t('userDetail.addedToProject'));
    setShowAddDialog(false);
    setAddProjectId('');
    setAddProjectRole('member');
    router.refresh();
  }

  async function handleRemoveFromProject(projectId: string) {
    if (!confirm(tCommon('confirm') + '?')) return;
    const result = await removeUserFromProject(profile.id, projectId);
    if (result.error) { toast.error(result.error); return; }

    const removed = projects.find((p) => p.project_id === projectId);
    setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    if (removed) {
      setAvailableProjects((prev) => [...prev, { id: removed.project_id, name: removed.name }]);
    }
    // Clean up local permission state
    setPermissions((prev) => prev.filter((p) => p.project_id !== projectId));
    setFolderPerms((prev) => prev.filter((fp) => fp.project_id !== projectId));
    toast.success(t('userDetail.removedFromProject'));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">
            {profile.full_name || profile.email}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {profile.is_superadmin && <Badge variant="default">Superadmin</Badge>}
          {orgMembership && (
            <Badge variant="secondary">{tRoles(orgMembership.role)}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('userDetail.overview')}</TabsTrigger>
          <TabsTrigger value="projects">
            {t('userDetail.projectsPermissions')} ({projects.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t('userDetail.userInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{tCommon('email')}</p>
                  <p className="text-sm font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('userDetail.memberSince')}</p>
                  <p className="text-sm font-medium">
                    {new Date(profile.created_at).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('userDetail.orgMembership')}</p>
                  <p className="text-sm font-medium">
                    {orgMembership
                      ? `${orgMembership.org_name} (${tRoles(orgMembership.role)})`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Superadmin</p>
                  <p className="text-sm font-medium">
                    {profile.is_superadmin ? tCommon('yes') : tCommon('no')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects & Permissions Tab */}
        <TabsContent value="projects">
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            {/* Left: Project list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{tProjects('title')}</h3>
                {availableProjects.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {t('userDetail.addToProject')}
                  </Button>
                )}
              </div>

              {projects.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('userDetail.noProjects')}
                </p>
              )}

              {projects.map((project) => (
                <div
                  key={project.project_id}
                  onClick={() => setSelectedProjectId(project.project_id)}
                  className={`cursor-pointer rounded-md border p-3 transition-colors ${
                    selectedProjectId === project.project_id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <Badge
                        variant={PROJECT_STATUS_VARIANTS[project.status] || 'outline'}
                        className="mt-1"
                      >
                        {tProjects(`statuses.${project.status}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Select
                        value={project.role}
                        onChange={(e) =>
                          handleRoleChange(project.project_id, e.target.value as ProjectRole)
                        }
                        className="h-8 w-auto text-xs"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        disabled={isOrgViewer}
                      >
                        <option value="admin">{PROJECT_ROLE_LABELS['admin']}</option>
                        <option value="member">{PROJECT_ROLE_LABELS['member']}</option>
                        <option value="follower">{PROJECT_ROLE_LABELS['follower']}</option>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromProject(project.project_id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Permission matrix */}
            <div>
              {!selectedProjectId && projects.length > 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    {t('userDetail.selectProjectHint')}
                  </CardContent>
                </Card>
              )}

              {selectedProjectId && selectedProject && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {selectedProject.name} — {t('userDetail.projectsPermissions')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isOrgViewer && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Uživatel je v organizaci jako prohlížející — má pouze přístup pro čtení
                      </div>
                    )}
                    {isFollower && !isOrgViewer && (
                      <p className="text-xs text-muted-foreground">
                        Sledující má přístup pouze pro čtení
                      </p>
                    )}
                    {/* Module permissions table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 pr-4 text-left font-medium">
                              {PERMISSION_ACTION_LABELS['can_view'] ? 'Modul' : 'Module'}
                            </th>
                            {ACTIONS.map((a) => (
                              <th key={a} className="px-3 py-2 text-center font-medium">
                                {PERMISSION_ACTION_LABELS[a]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {userModulePerms.map((row) => (
                            <tr key={row.module} className="border-b">
                              <td className="py-2 pr-4">
                                {PERMISSION_MODULE_LABELS[row.module]}
                              </td>
                              {ACTIONS.map((action) => {
                                const locked = isPermissionsLocked && action !== 'can_view';
                                const forcedChecked = isPermissionsLocked && action === 'can_view';
                                return (
                                  <td key={action} className="px-3 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={forcedChecked || row[action]}
                                      onChange={() => toggleModulePerm(row.module, action)}
                                      disabled={locked || forcedChecked}
                                      className={`h-4 w-4 rounded border-gray-300 ${locked ? 'opacity-40' : ''}`}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Folder permissions */}
                    {projectFolders.length > 0 && (
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <FolderOpen className="h-4 w-4" />
                          {t('userDetail.folderPermissions')}
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="py-2 pr-4 text-left font-medium">
                                  {PERMISSION_MODULE_LABELS['files'] || 'Složka'}
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                  {PERMISSION_ACTION_LABELS['can_view']}
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                  {PERMISSION_ACTION_LABELS['can_create']}
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                  {PERMISSION_ACTION_LABELS['can_delete']}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {userFolderPerms.map((row) => (
                                <tr key={row.folder_id} className="border-b">
                                  <td className="py-2 pr-4">{row.folder_name}</td>
                                  {(['can_view', 'can_create', 'can_delete'] as const).map(
                                    (action) => {
                                      const locked = isPermissionsLocked && action !== 'can_view';
                                      const forcedChecked = isPermissionsLocked && action === 'can_view';
                                      return (
                                        <td key={action} className="px-3 py-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={forcedChecked || row[action]}
                                            onChange={() =>
                                              toggleFolderPerm(row.folder_id, action)
                                            }
                                            disabled={locked || forcedChecked}
                                            className={`h-4 w-4 rounded border-gray-300 ${locked ? 'opacity-40' : ''}`}
                                          />
                                        </td>
                                      );
                                    }
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button onClick={handleSavePermissions} loading={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? tCommon('saving') : t('userDetail.savePermissions')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add to project dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)}>
        <DialogHeader>
          <DialogTitle>{t('userDetail.addToProject')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tCommon('project')}</Label>
            <Select
              value={addProjectId}
              onChange={(e) => setAddProjectId(e.target.value)}
            >
              <option value="">{t('userDetail.selectProject')}</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('userDetail.projectRole')}</Label>
            <Select
              value={addProjectRole}
              onChange={(e) => setAddProjectRole(e.target.value as ProjectRole)}
            >
              <option value="admin">{PROJECT_ROLE_LABELS['admin']}</option>
              <option value="member">{PROJECT_ROLE_LABELS['member']}</option>
              <option value="follower">{PROJECT_ROLE_LABELS['follower']}</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleAddToProject} disabled={!addProjectId}>
              {tCommon('add')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
