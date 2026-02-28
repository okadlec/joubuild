'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  projectId?: string;
  projectBar?: React.ReactNode;
}

export function DashboardShell({ children, user, projectId, projectBar }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
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
        <Sidebar projectId={projectId} onNavigate={handleClose} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={handleMenuClick} />
        {projectBar}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
