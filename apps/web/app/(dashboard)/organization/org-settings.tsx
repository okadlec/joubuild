'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, Upload, UserPlus, Trash2, MoreVertical, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrgRolePermissionsInfo } from '@/components/shared/role-permissions-info';
import { updateOrganization, uploadOrgLogo, addOrgMember, removeOrgMember, updateOrgMemberRole } from './actions';
import { toast } from 'sonner';

type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_VARIANTS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
}

interface OrgSettingsProps {
  org: Org;
  members: Member[];
  isAdmin: boolean;
}

export function OrgSettings({ org, members: initialMembers, isAdmin }: OrgSettingsProps) {
  const router = useRouter();
  const t = useTranslations('organization');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [logoUrl, setLogoUrl] = useState(org.logo_url);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<OrgRole>('member');
  const [inviting, setInviting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateOrganization(org.id, { name, slug });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('orgUpdated'));
      router.refresh();
    }
    setSaving(false);
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);
    const result = await uploadOrgLogo(org.id, formData);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setLogoUrl(result.data.logo_url);
    }
    setUploadingLogo(false);
  }

  async function handleAddMember() {
    if (!newMemberEmail.trim()) return;
    setInviting(true);
    const result = await addOrgMember(org.id, newMemberEmail.trim(), newMemberRole);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('memberInvited'));
      setShowAddMember(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      router.refresh();
    }
    setInviting(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm(tCommon('confirm') + '?')) return;
    const result = await removeOrgMember(org.id, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      setOpenMenuId(null);
      toast.success(t('memberRemoved'));
    }
  }

  async function handleRoleChange(userId: string, role: OrgRole) {
    const result = await updateOrgMemberRole(org.id, userId, role);
    if (result.error) {
      toast.error(result.error);
    } else {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
      setOpenMenuId(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings')}</p>
      </div>

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Logo */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {logoUrl ? (
                <img src={logoUrl} alt={org.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            {isAdmin && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="org-logo-upload"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('org-logo-upload')?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingLogo ? tCommon('loading') : tCommon('upload')}
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t('slug')}</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t('plan')}</Label>
              <Badge variant="secondary">{org.plan}</Badge>
            </div>
            {isAdmin && (
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? tCommon('loading') : tCommon('save')}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{t('members')}</CardTitle>
            <OrgRolePermissionsInfo />
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {tCommon('add')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const memberRole = member.role as OrgRole;
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
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
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_VARIANTS[memberRole] || 'outline'}>
                        {tRoles(memberRole)}
                      </Badge>
                      {isAdmin && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setOpenMenuId(openMenuId === member.user_id ? null : member.user_id)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {openMenuId === member.user_id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
                              <p className="px-2 py-1 text-xs text-muted-foreground">{tCommon('edit')}</p>
                              {(['owner', 'admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                                <button
                                  key={role}
                                  className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${memberRole === role ? 'font-semibold text-primary' : ''}`}
                                  onClick={() => handleRoleChange(member.user_id, role)}
                                >
                                  {tRoles(role)}
                                  {memberRole === role && ' •'}
                                </button>
                              ))}
                              <div className="my-1 border-t" />
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveMember(member.user_id)}
                              >
                                <Trash2 className="h-4 w-4" /> {tCommon('remove')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add member dialog */}
      <Dialog open={showAddMember} onClose={() => setShowAddMember(false)}>
        <DialogHeader>
          <DialogTitle>{t('inviteMember')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>{tCommon('status')}</Label>
            <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as OrgRole)}>
              <option value="admin">{tRoles('admin')}</option>
              <option value="member">{tRoles('member')}</option>
              <option value="viewer">{tRoles('viewer')}</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddMember(false)}>{tCommon('cancel')}</Button>
            <Button onClick={handleAddMember} disabled={inviting}>
              {inviting ? tCommon('loading') : tCommon('add')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
