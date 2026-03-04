'use client';

import { useTranslations } from 'next-intl';
import { Users, FolderOpen, Building2, Database, HardDrive, Image, FileText, Sheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/utils';

interface StorageStats {
  photos: number;
  documents: number;
  sheets: number;
  total: number;
}

interface SuperadminOverviewProps {
  kind: 'superadmin';
  stats: {
    users: number;
    projects: number;
    organizations: number;
    dbSize: number;
  };
  storage: StorageStats;
}

interface OrgAdminOverviewProps {
  kind: 'org-admin';
  stats: {
    members: number;
    projects: number;
  };
  storage: StorageStats;
}

type AdminOverviewProps = SuperadminOverviewProps | OrgAdminOverviewProps;

export function AdminOverview(props: AdminOverviewProps) {
  const t = useTranslations('admin');

  const storageItems = [
    { label: t('storage.photos'), value: props.storage.photos, icon: Image, color: 'bg-blue-500' },
    { label: t('storage.documents'), value: props.storage.documents, icon: FileText, color: 'bg-green-500' },
    { label: t('storage.plans'), value: props.storage.sheets, icon: Sheet, color: 'bg-orange-500' },
  ];

  const maxStorage = Math.max(props.storage.total, 1);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {props.kind === 'superadmin' ? (
          <>
            <StatCard icon={Users} label={t('stats.users')} value={props.stats.users} />
            <StatCard icon={FolderOpen} label={t('stats.projects')} value={props.stats.projects} />
            <StatCard icon={Building2} label={t('stats.organizations')} value={props.stats.organizations} />
            <StatCard icon={Database} label={t('stats.database')} value={formatBytes(props.stats.dbSize)} />
          </>
        ) : (
          <>
            <StatCard icon={Users} label={t('stats.members')} value={props.stats.members} />
            <StatCard icon={FolderOpen} label={t('stats.projects')} value={props.stats.projects} />
          </>
        )}
      </div>

      {/* Storage breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t('storage.title')} — {formatBytes(props.storage.total)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </span>
                <span className="font-medium">{formatBytes(item.value)}</span>
              </div>
              <Progress value={(item.value / maxStorage) * 100} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
