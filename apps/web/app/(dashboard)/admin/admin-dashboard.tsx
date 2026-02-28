'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FolderOpen, Building2, Shield, ShieldOff, UserPlus, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createUser, updateUserRole, deleteUser } from './actions';
import { toast } from 'sonner';

type OrgRole = 'owner' | 'admin' | 'member';

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Vlastnik',
  admin: 'Admin',
  member: 'Clen',
};

const ORG_ROLE_VARIANTS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
};

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_superadmin: boolean;
  created_at: string;
}

interface AdminDashboardProps {
  stats: {
    users: number;
    projects: number;
    organizations: number;
  };
  users: Profile[];
  orgRoleMap: Record<string, string>;
}

export function AdminDashboard({ stats, users: initialUsers, orgRoleMap: initialOrgRoleMap }: AdminDashboardProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [orgRoleMap, setOrgRoleMap] = useState(initialOrgRoleMap);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  async function toggleSuperadmin(userId: string, currentValue: boolean) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_superadmin: !currentValue })
      .eq('id', userId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, is_superadmin: !currentValue } : u)
    );
    toast.success(!currentValue ? 'Superadmin pridan' : 'Superadmin odebran');
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const result = await createUser({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      fullName: formData.get('fullName') as string,
      orgRole: formData.get('orgRole') as OrgRole,
    });

    setCreating(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Uzivatel vytvoren');
    setShowCreateDialog(false);
    router.refresh();
  }

  async function handleRoleChange(userId: string, newRole: OrgRole) {
    const result = await updateUserRole(userId, newRole);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setOrgRoleMap(prev => ({ ...prev, [userId]: newRole }));
    setOpenMenuId(null);
    toast.success('Role zmenena');
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Opravdu chcete smazat tohoto uzivatele? Tato akce je nevratna.')) return;

    const result = await deleteUser(userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    setOpenMenuId(null);
    toast.success('Uzivatel smazan');
  }

  const statCards = [
    { label: 'Uzivatele', value: stats.users, icon: Users },
    { label: 'Projekty', value: stats.projects, icon: FolderOpen },
    { label: 'Organizace', value: stats.organizations, icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sprava platformy JouBuild</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Vytvorit uzivatele
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uzivatele</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => {
              const orgRole = orgRoleMap[user.id] as OrgRole | undefined;
              return (
                <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.full_name || user.email || '?'} size="sm" />
                    <div>
                      <p className="text-sm font-medium">
                        {user.full_name || user.email || user.id.slice(0, 8)}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {orgRole && (
                      <Badge variant={ORG_ROLE_VARIANTS[orgRole] || 'outline'}>
                        {ORG_ROLE_LABELS[orgRole] || orgRole}
                      </Badge>
                    )}
                    {user.is_superadmin && (
                      <Badge variant="default">Superadmin</Badge>
                    )}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {openMenuId === user.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                            onClick={() => toggleSuperadmin(user.id, user.is_superadmin)}
                          >
                            {user.is_superadmin ? (
                              <><ShieldOff className="h-4 w-4" /> Odebrat superadmin</>
                            ) : (
                              <><Shield className="h-4 w-4" /> Nastavit superadmin</>
                            )}
                          </button>
                          <div className="my-1 border-t" />
                          <p className="px-2 py-1 text-xs text-muted-foreground">Org role</p>
                          {(['owner', 'admin', 'member'] as OrgRole[]).map((role) => (
                            <button
                              key={role}
                              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${orgRole === role ? 'font-semibold text-primary' : ''}`}
                              onClick={() => handleRoleChange(user.id, role)}
                            >
                              {ORG_ROLE_LABELS[role]}
                              {orgRole === role && ' *'}
                            </button>
                          ))}
                          <div className="my-1 border-t" />
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Smazat uzivatele
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogHeader>
          <DialogTitle>Vytvorit uzivatele</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Jmeno</Label>
            <Input id="fullName" name="fullName" required placeholder="Jan Novak" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="jan@firma.cz" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Heslo</Label>
            <Input id="password" name="password" type="password" required minLength={6} placeholder="Min. 6 znaku" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgRole">Role v organizaci</Label>
            <Select id="orgRole" name="orgRole" defaultValue="member">
              <option value="owner">Vlastnik (reditel)</option>
              <option value="admin">Admin (spravce)</option>
              <option value="member">Clen</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
              Zrusit
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Vytvari se...' : 'Vytvorit'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
