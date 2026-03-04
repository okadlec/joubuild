'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map,
  CheckSquare,
  Camera,
  FileText,
  BookOpen,
  MoreHorizontal,
  ClipboardList,
  Clock,
  BarChart2,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BottomNavProps {
  hidden?: boolean;
}

export function BottomNav({ hidden }: BottomNavProps) {
  const pathname = usePathname();
  const projectMatch = pathname.match(/\/project\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : undefined;
  const [showMore, setShowMore] = useState(false);

  // Only show in project context
  if (!projectId || hidden) return null;

  const items = [
    { href: `/project/${projectId}/plans`, label: 'Výkresy', icon: Map },
    { href: `/project/${projectId}/tasks`, label: 'Úkoly', icon: CheckSquare },
    { href: `/project/${projectId}/photos`, label: 'Fotky', icon: Camera },
    { href: `/project/${projectId}/files`, label: 'Soubory', icon: FileText },
  ];

  const moreItems = [
    { href: `/project/${projectId}/specifications`, label: 'Specifikace', icon: BookOpen },
    { href: `/project/${projectId}/forms`, label: 'Formuláře', icon: ClipboardList },
    { href: `/project/${projectId}/timesheets`, label: 'Výkazy', icon: Clock },
    { href: `/project/${projectId}/reports`, label: 'Reporty', icon: BarChart2 },
    { href: `/project/${projectId}/settings`, label: 'Nastavení', icon: Settings },
  ];

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-0 right-0 rounded-t-xl border-t bg-background p-4"
            style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Více</span>
              <button onClick={() => setShowMore(false)} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg p-3 transition-all active:scale-95 active:bg-accent',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar — total height: h-14 (3.5rem) + env(safe-area-inset-bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-[60px] items-center justify-around border-t bg-background pt-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-all active:scale-95 active:bg-accent',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-all active:scale-95 active:bg-accent',
            showMore ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Více</span>
        </button>
      </nav>
    </>
  );
}
