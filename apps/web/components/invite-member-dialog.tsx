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
    role: string
  ) => Promise<{ error?: string; success?: boolean; directlyAdded?: boolean }>;
}

export function InviteMemberDialog({ open, onClose, onInvite }: InviteMemberDialogProps) {
  const t = useTranslations('admin');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const result = await onInvite(email.trim(), role);
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
