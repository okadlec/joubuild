'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isInProject = /\/project\/[^/]+/.test(pathname);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Mobile overlay — only when sidebar is open and NOT in project context (bottom nav replaces it) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleClose}
        />
      )}

      {/* Sidebar — hidden on mobile, shown on lg+ */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <Sidebar onNavigate={handleClose} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={handleMenuClick} hideHamburgerInProject={isInProject} />
        {/* pb accounts for bottom nav: 60px + safe-area-inset-bottom */}
        <main className={`flex-1 overflow-auto bg-background p-2 sm:p-4 lg:p-6 ${isInProject ? 'pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* Bottom nav — only on mobile, only in project context */}
      <BottomNav />
    </div>
  );
}
