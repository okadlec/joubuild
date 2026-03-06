'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, User, Building2, Menu, Sun, Moon, Monitor, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown-menu';
import { OfflineIndicator } from './offline-indicator';
import { NotificationsPanel } from './notifications-panel';

type Theme = 'light' | 'dark' | 'system';
const themeCycle: Theme[] = ['light', 'dark', 'system'];

interface HeaderProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  onMenuClick?: () => void;
  hideHamburgerInProject?: boolean;
}

function getThemeFromCookie(): Theme {
  const match = document.cookie.match(/(?:^|; )theme=(\w+)/);
  const val = match?.[1] as Theme | undefined;
  return val && themeCycle.includes(val) ? val : 'light';
}

export function Header({ user, onMenuClick, hideHamburgerInProject }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations('header');
  const tSidebar = useTranslations('sidebar');
  const [currentTheme, setCurrentTheme] = React.useState<Theme>('light');
  const [themeLoading, setThemeLoading] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    setCurrentTheme(getThemeFromCookie());
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
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

        <button
          onClick={async () => {
            setThemeLoading(true);
            const next = themeCycle[(themeCycle.indexOf(currentTheme) + 1) % themeCycle.length];
            await fetch('/api/theme', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ theme: next }),
            });
            setCurrentTheme(next);
            const shouldBeDark =
              next === 'dark' ||
              (next === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', shouldBeDark);
            setThemeLoading(false);
            router.refresh();
          }}
          disabled={themeLoading}
          className="rounded-md p-2 hover:bg-accent disabled:opacity-50"
          title={t(currentTheme === 'dark' ? 'themeDark' : currentTheme === 'system' ? 'themeSystem' : 'themeLight')}
        >
          {themeLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : currentTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : currentTheme === 'system' ? (
            <Monitor className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

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
            {signingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {t('signOut')}
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
