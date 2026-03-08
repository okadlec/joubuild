'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Save } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  PROJECT_ROLE_LABELS,
} from '@joubuild/shared';
import type {
  OrgRole,
  ProjectRole,
  PermissionModule,
} from '@joubuild/shared';
import { getMemberProjectAccess } from './actions';
import {
  addUserToProject,
  removeUserFromProject,
  updateProjectMemberRole,
  updateUserProjectPermissions,
} from '@/app/(dashboard)/admin/users/[userId]/actions';

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete'] as const;

const ORG_ROLE_VARIANTS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

interface MemberProject {
  project_id: string;
  role: string;
  name: string;
  status: string;
}

interface Permission {
  project_id: string;
  user_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface Member {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: OrgRole;
}

interface MemberProjectsDialogProps {
  open: boolean;
  onClose: () => void;
  member: Member;
  orgId: string;
}

export function MemberProjectsDialog({ open, onClose, member, orgId }: MemberProjectsDialogProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tRoles = useTranslations('roles');
  const tProjects = useTranslations('projects');

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<MemberProject[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add-to-project sub-dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addProjectId, setAddProjectId] = useState('');
  const [addProjectRole, setAddProjectRole] = useState<ProjectRole>('member');

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedProjectId(null);
    getMemberProjectAccess(member.user_id, orgId).then((result) => {
      if ('error' in result) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setProjects(result.memberProjects);
      setPermissions(result.permissions);
      setAvailableProjects(result.availableProjects);
      setLoading(false);
    });
  }, [open, member.user_id, orgId]);

  const selectedProject = projects.find((p) => p.project_id === selectedProjectId);

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

  function toggleModulePerm(module: PermissionModule, action: typeof ACTIONS[number]) {
    if (!selectedProjectId) return;
    setPermissions((prev) => {
      const idx = prev.findIndex(
        (p) => p.project_id === selectedProjectId && p.module === module
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [action]: !updated[idx][action as keyof Permission] };
        return updated;
      }
      return [
        ...prev,
        {
          project_id: selectedProjectId,
          user_id: member.user_id,
          module,
          can_view: action === 'can_view' ? false : true,
          can_create: action === 'can_create' ? false : true,
          can_edit: action === 'can_edit' ? false : true,
          can_delete: action === 'can_delete' ? true : false,
        },
      ];
    });
  }

  async function handleRoleChange(projectId: string, newRole: ProjectRole) {
    const result = await updateProjectMemberRole(member.user_id, projectId, newRole);
    if (result.error) { toast.error(result.error); return; }
    setProjects((prev) =>
      prev.map((p) => (p.project_id === projectId ? { ...p, role: newRole } : p))
    );
    toast.success(t('userDetail.roleUpdated'));
  }

  async function handleRemoveFromProject(projectId: string) {
    if (!confirm(tCommon('confirm') + '?')) return;
    const result = await removeUserFromProject(member.user_id, projectId);
    if (result.error) { toast.error(result.error); return; }
    const removed = projects.find((p) => p.project_id === projectId);
    setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    setPermissions((prev) => prev.filter((p) => p.project_id !== projectId));
    if (removed) {
      setAvailableProjects((prev) => [...prev, { id: removed.project_id, name: removed.name }]);
    }
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    toast.success('Odebráno z projektu');
  }

  async function handleAddToProject() {
    if (!addProjectId) return;
    const result = await addUserToProject(member.user_id, addProjectId, addProjectRole);
    if (result.error) { toast.error(result.error); return; }
    const added = availableProjects.find((p) => p.id === addProjectId);
    if (added) {
      setProjects((prev) => [
        ...prev,
        { project_id: added.id, name: added.name, role: addProjectRole, status: 'active' },
      ]);
      setAvailableProjects((prev) => prev.filter((p) => p.id !== addProjectId));
    }
    setShowAddDialog(false);
    setAddProjectId('');
    setAddProjectRole('member');
    toast.success('Přidáno do projektu');
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

    const result = await updateUserProjectPermissions(member.user_id, selectedProjectId, moduleRows);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success(t('userDetail.permissionsSaved'));
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar name={member.full_name || member.email || '?'} size="sm" />
            <div>
              <span>{member.full_name || member.email || member.user_id.slice(0, 8)}</span>
              {member.email && member.full_name && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{member.email}</span>
              )}
            </div>
            <Badge variant={ORG_ROLE_VARIANTS[member.role]} className="ml-auto">
              {tRoles(member.role)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {tCommon('loading')}...
          </div>
        ) : (
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
                    <p className="min-w-0 truncate text-sm font-medium">{project.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Select
                        value={project.role}
                        onChange={(e) =>
                          handleRoleChange(project.project_id, e.target.value as ProjectRole)
                        }
                        className="h-8 w-auto text-xs"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 pr-4 text-left font-medium">Modul</th>
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
                              {ACTIONS.map((action) => (
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
        )}
      </Dialog>

      {/* Add to project sub-dialog */}
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
    </>
  );
}
