'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AdminShellProps {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function AdminShell({ title, subtitle, navItems, children }: AdminShellProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b pb-px">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
