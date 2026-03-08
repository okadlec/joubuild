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
import type { OrgRole } from '@joubuild/shared';

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: string,
    projectIds?: string[]
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
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  function toggleProject(projectId: string) {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const projectIds = selectedProjects.size > 0 ? Array.from(selectedProjects) : undefined;
    const result = await onInvite(email.trim(), role, projectIds);
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
    setSelectedProjects(new Set());
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
                    checked={selectedProjects.has(project.id)}
                    onChange={() => toggleProject(project.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor={`project-${project.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {project.name}
                  </label>
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
