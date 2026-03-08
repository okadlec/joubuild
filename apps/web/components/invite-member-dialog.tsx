'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { PROJECT_ROLE_LABELS } from '@joubuild/shared';
import type { OrgRole, ProjectRole } from '@joubuild/shared';

interface ProjectAssignment {
  projectId: string;
  role: ProjectRole;
}

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: string,
    projectAssignments?: ProjectAssignment[]
  ) => Promise<{ error?: string; success?: boolean; directlyAdded?: boolean }>;
  projects?: { id: string; name: string }[];
}

export function InviteMemberDialog({ open, onClose, onInvite, projects }: InviteMemberDialogProps) {
  const t = useTranslations('admin');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [loading, setLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Record<string, ProjectRole>>({});

  function toggleProject(projectId: string) {
    setSelectedProjects((prev) => {
      if (prev[projectId]) {
        const { [projectId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [projectId]: 'member' };
    });
  }

  function setProjectRole(projectId: string, role: ProjectRole) {
    setSelectedProjects((prev) => ({ ...prev, [projectId]: role }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const projectAssignments = Object.entries(selectedProjects).map(
      ([projectId, role]) => ({ projectId, role })
    );
    const result = await onInvite(email.trim(), role, projectAssignments.length > 0 ? projectAssignments : undefined);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.directlyAdded) {
      toast.success('Uživatel byl přidán do organizace');
    } else {
      toast.success('Pozvánka byla odeslána');
    }

    setEmail('');
    setRole('member');
    setSelectedProjects({});
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pozvat člena
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">{t('usersList.role')}</Label>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
          >
            <option value="admin">{tRoles('admin')}</option>
            <option value="member">{tRoles('member')}</option>
            <option value="viewer">{tRoles('viewer')}</option>
          </Select>
        </div>

        {projects && projects.length > 0 && (
          <div className="space-y-2">
            <Label>Projekty</Label>
            <p className="text-xs text-muted-foreground">
              Projekty se přiřadí pouze existujícím uživatelům. Pro nové uživatele se přiřadí po přijetí pozvánky.
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`project-${project.id}`}
                    checked={!!selectedProjects[project.id]}
                    onChange={() => toggleProject(project.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor={`project-${project.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {project.name}
                  </label>
                  {selectedProjects[project.id] && (
                    <Select
                      value={selectedProjects[project.id]}
                      onChange={(e) => setProjectRole(project.id, e.target.value as ProjectRole)}
                      className="h-7 w-auto text-xs"
                    >
                      <option value="admin">{PROJECT_ROLE_LABELS['admin']}</option>
                      <option value="member">{PROJECT_ROLE_LABELS['member']}</option>
                      <option value="follower">{PROJECT_ROLE_LABELS['follower']}</option>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? tCommon('loading') : 'Pozvat'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
