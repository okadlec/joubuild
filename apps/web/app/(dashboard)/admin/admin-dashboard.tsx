'use client';

import { useState } from 'react';
import { Users, FolderOpen, Building2, Shield, ShieldOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
}

export function AdminDashboard({ stats, users: initialUsers }: AdminDashboardProps) {
  const [users, setUsers] = useState(initialUsers);

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
    toast.success(!currentValue ? 'Superadmin přidán' : 'Superadmin odebrán');
  }

  const statCards = [
    { label: 'Uživatelé', value: stats.users, icon: Users },
    { label: 'Projekty', value: stats.projects, icon: FolderOpen },
    { label: 'Organizace', value: stats.organizations, icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Správa platformy JouBuild</p>
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
          <CardTitle>Uživatelé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
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
                  {user.is_superadmin && (
                    <Badge variant="default">Superadmin</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSuperadmin(user.id, user.is_superadmin)}
                    title={user.is_superadmin ? 'Odebrat superadmin' : 'Nastavit superadmin'}
                  >
                    {user.is_superadmin ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
