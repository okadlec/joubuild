'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, FolderOpen, HardDrive, Image,
  FileText, Sheet, MoreVertical, UserMinus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatBytes } from '@/lib/utils';
import type { OrgRole } from '@joubuild/shared';
import { updateMemberRole, removeMember } from './actions';

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Vlastnik',
  admin: 'Admin',
  member: 'Clen',
  viewer: 'Prohlizejici',
};

const ORG_ROLE_VARIANTS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktivni',
  archived: 'Archivovany',
  completed: 'Dokonceny',
};

interface Member {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: OrgRole;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface StorageStats {
  photos: number;
  documents: number;
  sheets: number;
  total: number;
}

interface OrgDetailProps {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  members: Member[];
  projects: Project[];
  storage: StorageStats;
}

export function OrgDetail({ org, members: initialMembers, projects, storage }: OrgDetailProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const storageItems = [
    { label: 'Fotky', value: storage.photos, icon: Image },
    { label: 'Dokumenty', value: storage.documents, icon: FileText },
    { label: 'Plany', value: storage.sheets, icon: Sheet },
  ];

  const maxStorage = Math.max(storage.total, 1);

  async function handleRoleChange(userId: string, newRole: OrgRole) {
    const result = await updateMemberRole(userId, org.id, newRole);
    if (result.error) { toast.error(result.error); return; }
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
    );
    setOpenMenuId(null);
    toast.success('Role zmenena');
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Opravdu chcete odebrat tohoto clena?')) return;
    const result = await removeMember(userId, org.id);
    if (result.error) { toast.error(result.error); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    setOpenMenuId(null);
    toast.success('Clen odebran');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold">{org.name}</h2>
          <p className="text-sm text-muted-foreground">/{org.slug}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {org.plan}
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Prehled</TabsTrigger>
          <TabsTrigger value="members">Clenove ({members.length})</TabsTrigger>
          <TabsTrigger value="projects">Projekty ({projects.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-sm text-muted-foreground">Clenove</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-sm text-muted-foreground">Projekty</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <HardDrive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatBytes(storage.total)}</p>
                  <p className="text-sm text-muted-foreground">Uloziste</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Uloziste — {formatBytes(storage.total)}
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
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {members.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Zadni clenove</p>
                )}
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.full_name || member.email || '?'} size="sm" />
                      <div>
                        <p className="text-sm font-medium">
                          {member.full_name || member.email || member.user_id.slice(0, 8)}
                        </p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ORG_ROLE_VARIANTS[member.role]}>
                        {ORG_ROLE_LABELS[member.role]}
                      </Badge>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setOpenMenuId(openMenuId === member.user_id ? null : member.user_id)
                          }
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {openMenuId === member.user_id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                            <p className="px-2 py-1 text-xs text-muted-foreground">Zmenit roli</p>
                            {(['owner', 'admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                              <button
                                key={role}
                                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${
                                  member.role === role ? 'font-semibold text-primary' : ''
                                }`}
                                onClick={() => handleRoleChange(member.user_id, role)}
                              >
                                {ORG_ROLE_LABELS[role]}
                                {member.role === role && ' *'}
                              </button>
                            ))}
                            <div className="my-1 border-t" />
                            <button
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <UserMinus className="h-4 w-4" /> Odebrat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {projects.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Zadne projekty</p>
                )}
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {PROJECT_STATUS_LABELS[project.status] || project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
