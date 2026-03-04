'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Users, FolderOpen, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatBytes } from '@/lib/utils';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  members_count: number;
  projects_count: number;
  storage_bytes: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'outline',
  pro: 'secondary',
  enterprise: 'default',
};

export function OrgsList({ orgs: initialOrgs }: { orgs: OrgRow[] }) {
  const [search, setSearch] = useState('');

  const filtered = initialOrgs.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="relative sm:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat organizaci..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Zadne organizace nenalezeny
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((org) => (
          <Link key={org.id} href={`/admin/organizations/${org.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <Badge variant={PLAN_VARIANTS[org.plan] || 'outline'}>
                    {PLAN_LABELS[org.plan] || org.plan}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {org.members_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {org.projects_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    {formatBytes(org.storage_bytes)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
