'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  CheckSquare,
  Camera,
  ClipboardList,
  BarChart2,
  FileText,
  BookOpen,
  Settings,
  Building2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAdminAccess } from '@/lib/hooks/use-admin-access';

interface Organization {
  id: string;
  name: string;
}

interface SidebarProps {
  organizations?: Organization[];
  currentOrgId?: string;
  onOrgChange?: (orgId: string) => void;
  onNavigate?: () => void;
}

export function Sidebar({ organizations = [], currentOrgId, onOrgChange, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const projectMatch = pathname.match(/\/project\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : undefined;
  const [collapsed, setCollapsed] = useState(false);
  const { hasAccess: isAdmin } = useAdminAccess();

  const mainNav = [
    { href: '/projects', label: 'Projekty', icon: FolderOpen },
    { href: '/organization', label: 'Organizace', icon: Building2 },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const projectNav = projectId
    ? [
        { href: `/project/${projectId}/plans`, label: 'Výkresy', icon: Map },
        { href: `/project/${projectId}/tasks`, label: 'Úkoly', icon: CheckSquare },
        { href: `/project/${projectId}/photos`, label: 'Fotky', icon: Camera },
        { href: `/project/${projectId}/forms`, label: 'Formuláře', icon: ClipboardList },
        { href: `/project/${projectId}/timesheets`, label: 'Výkazy', icon: Clock },
        { href: `/project/${projectId}/reports`, label: 'Reporty', icon: BarChart2 },
        { href: `/project/${projectId}/files`, label: 'Soubory', icon: FileText },
        { href: `/project/${projectId}/specifications`, label: 'Specifikace', icon: BookOpen },
        { href: `/project/${projectId}/settings`, label: 'Nastavení', icon: Settings },
      ]
    : [];

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/projects" className="text-lg font-bold text-primary">
            JouBuild
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 hover:bg-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && organizations.length > 1 && (
        <div className="border-b px-3 py-2">
          <select
            value={currentOrgId || ''}
            onChange={(e) => onOrgChange?.(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {projectNav.length > 0 && (
          <>
            <div className="my-3 border-t" />
            {!collapsed && (
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Projekt
              </p>
            )}
            {projectNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
