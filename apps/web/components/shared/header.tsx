'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, User, Building2, Menu } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown-menu';
import { OfflineIndicator } from './offline-indicator';
import { NotificationsPanel } from './notifications-panel';

interface HeaderProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  onMenuClick?: () => void;
  hideHamburgerInProject?: boolean;
}

export function Header({ user, onMenuClick, hideHamburgerInProject }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations('header');
  const tSidebar = useTranslations('sidebar');

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between border-b bg-background px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2">
        {onMenuClick && !hideHamburgerInProject && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 hover:bg-accent lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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
            <p className="text-sm font-medium">{user.full_name || t('user')}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownSeparator />
          <DropdownItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            {t('profile')}
          </DropdownItem>
          <DropdownItem onClick={() => router.push('/organization')}>
            <Building2 className="mr-2 h-4 w-4" />
            {tSidebar('organization')}
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={handleSignOut} destructive>
            <LogOut className="mr-2 h-4 w-4" />
            {t('signOut')}
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
