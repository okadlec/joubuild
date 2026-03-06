'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  UserPlus, MoreVertical, Trash2, Shield, ShieldOff,
  UserMinus, Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { OrgRole } from '@joubuild/shared';
import {
  createUser,
  toggleSuperadmin,
  updateUserOrgRole,
  deleteUser,
  removeUserFromOrg,
} from './actions';

const ORG_ROLE_VARIANTS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  is_superadmin: boolean;
  created_at: string;
  org_role: OrgRole | null;
  org_id: string | null;
  org_name: string | null;
}

interface UsersListProps {
  users: UserRow[];
  isSuperadmin: boolean;
  currentUserId: string;
  organizationId: string | null;
  availableRoles: OrgRole[];
}

export function UsersList({
  users: initialUsers,
  isSuperadmin,
  currentUserId,
  organizationId,
  availableRoles,
}: UsersListProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function getRoleLabel(role: OrgRole): string {
    return tRoles(role);
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    const result = await createUser({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      fullName: formData.get('fullName') as string,
      orgRole: formData.get('orgRole') as OrgRole,
      organizationId: organizationId ?? undefined,
    });
    setCreating(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success(t('usersList.title'));
    setShowCreateDialog(false);
    router.refresh();
  }

  async function handleToggleSuperadmin(userId: string) {
    const result = await toggleSuperadmin(userId);
    if (result.error) { toast.error(result.error); return; }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_superadmin: result.data!.is_superadmin } : u
      )
    );
    setOpenMenuId(null);
  }

  async function handleRoleChange(userId: string, orgId: string, newRole: OrgRole) {
    const result = await updateUserOrgRole(userId, orgId, newRole);
    if (result.error) { toast.error(result.error); return; }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, org_role: newRole } : u))
    );
    setOpenMenuId(null);
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm(tCommon('confirm') + '?')) return;
    const result = await deleteUser(userId);
    if (result.error) { toast.error(result.error); return; }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setOpenMenuId(null);
  }

  async function handleRemoveFromOrg(userId: string, orgId: string) {
    if (!confirm(tCommon('confirm') + '?')) return;
    const result = await removeUserFromOrg(userId, orgId);
    if (result.error) { toast.error(result.error); return; }
    if (isSuperadmin) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, org_role: null, org_id: null } : u))
      );
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setOpenMenuId(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{isSuperadmin ? t('users') : t('members')}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('usersList.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                {tCommon('add')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('usersList.noUsers')}
              </p>
            )}
            {filtered.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => router.push(`/admin/users/${user.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={user.full_name || user.email || '?'} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.full_name || user.email || user.id.slice(0, 8)}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user.org_role && (
                    <Badge variant={ORG_ROLE_VARIANTS[user.org_role] || 'outline'}>
                      {getRoleLabel(user.org_role)}
                    </Badge>
                  )}
                  {isSuperadmin && user.org_name && (
                    <Badge variant="outline">{user.org_name}</Badge>
                  )}
                  {user.is_superadmin && <Badge variant="default">Superadmin</Badge>}

                  {user.id !== currentUserId && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === user.id ? null : user.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {openMenuId === user.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md" onClick={(e) => e.stopPropagation()}>
                          {isSuperadmin && (
                            <button
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                              onClick={() => handleToggleSuperadmin(user.id)}
                            >
                              {user.is_superadmin ? (
                                <><ShieldOff className="h-4 w-4" /> {tCommon('remove')} superadmin</>
                              ) : (
                                <><Shield className="h-4 w-4" /> Superadmin</>
                              )}
                            </button>
                          )}

                          {user.org_id && (
                            <>
                              <div className="my-1 border-t" />
                              <p className="px-2 py-1 text-xs text-muted-foreground">{t('usersList.role')}</p>
                              {availableRoles.map((role) => (
                                <button
                                  key={role}
                                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${
                                    user.org_role === role ? 'font-semibold text-primary' : ''
                                  }`}
                                  onClick={() => handleRoleChange(user.id, user.org_id!, role)}
                                >
                                  {getRoleLabel(role)}
                                  {user.org_role === role && ' *'}
                                </button>
                              ))}
                              <div className="my-1 border-t" />
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveFromOrg(user.id, user.org_id!)}
                              >
                                <UserMinus className="h-4 w-4" /> {tCommon('remove')}
                              </button>
                            </>
                          )}

                          {isSuperadmin && (
                            <>
                              <div className="my-1 border-t" />
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" /> {tCommon('delete')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogHeader>
          <DialogTitle>{tCommon('create')} {tCommon('user').toLowerCase()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('usersList.name')}</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{tCommon('password')}</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgRole">{t('usersList.role')}</Label>
            <Select id="orgRole" name="orgRole" defaultValue="member">
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? tCommon('loading') : tCommon('create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
