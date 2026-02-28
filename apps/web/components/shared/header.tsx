'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Search } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { OfflineIndicator } from './offline-indicator';
import { NotificationsPanel } from './notifications-panel';

interface HeaderProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat..."
            className="h-9 w-64 pl-8"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <OfflineIndicator />
        <NotificationsPanel />

        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
              <Avatar
                name={user.full_name || user.email}
                src={user.avatar_url}
                size="sm"
              />
            </button>
          }
        >
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.full_name || 'Uživatel'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownSeparator />
          <DropdownItem onClick={() => router.push('/organization')}>
            <User className="mr-2 h-4 w-4" />
            Profil
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={handleSignOut} destructive>
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit se
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
