'use client';

import { Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RolePermission {
  role: string;
  label: string;
  permissions: string[];
}

const ORG_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'owner',
    label: 'Vlastník',
    permissions: [
      'Plná správa organizace',
      'Vytvářet a mazat projekty',
      'Spravovat členy organizace',
      'Přiřazovat role',
      'Přístup k admin dashboardu',
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    permissions: [
      'Vytvářet a mazat projekty',
      'Spravovat členy organizace',
      'Přiřazovat role (kromě owner)',
      'Přístup k admin dashboardu',
    ],
  },
  {
    role: 'member',
    label: 'Člen',
    permissions: [
      'Vytvářet úkoly a komentáře',
      'Nahrávat fotky a dokumenty',
      'Editovat anotace',
      'Zapisovat výkazy',
    ],
  },
  {
    role: 'viewer',
    label: 'Prohlížející',
    permissions: [
      'Pouze prohlížet projekty',
      'Zobrazit výkresy a fotky',
      'Bez možnosti úprav',
    ],
  },
];

const PROJECT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'admin',
    label: 'Administrátor',
    permissions: [
      'Spravovat členy projektu',
      'Mazat projekt',
      'Plný přístup ke všem funkcím',
    ],
  },
  {
    role: 'member',
    label: 'Člen',
    permissions: [
      'Vytvářet úkoly a komentáře',
      'Nahrávat fotky a dokumenty',
      'Editovat anotace',
    ],
  },
  {
    role: 'follower',
    label: 'Sledující',
    permissions: [
      'Pouze prohlížet projekt',
      'Bez možnosti úprav',
    ],
  },
];

function PermissionsTooltip({
  permissions,
  children,
}: {
  permissions: RolePermission[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
      >
        {children}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover p-3 shadow-lg">
          <h4 className="mb-2 text-sm font-semibold">Oprávnění rolí</h4>
          <div className="space-y-3">
            {permissions.map((rp) => (
              <div key={rp.role}>
                <p className="text-xs font-medium text-primary">{rp.label}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {rp.permissions.map((p) => (
                    <li key={p} className="text-xs text-muted-foreground">• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgRolePermissionsInfo() {
  return (
    <PermissionsTooltip permissions={ORG_ROLE_PERMISSIONS}>
      <Info className="h-4 w-4" />
    </PermissionsTooltip>
  );
}

export function ProjectRolePermissionsInfo() {
  return (
    <PermissionsTooltip permissions={PROJECT_ROLE_PERMISSIONS}>
      <Info className="h-4 w-4" />
    </PermissionsTooltip>
  );
}
