'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, Users, FolderOpen, HardDrive, Image,
  FileText, Sheet, MoreVertical, UserMinus, Mail, X, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatBytes } from '@/lib/utils';
import type { OrgRole, OrganizationInvitation } from '@joubuild/shared';
import { updateMemberRole, removeMember, inviteOrgMemberFromAdmin, cancelInvitationFromAdmin, resendInvitationFromAdmin } from './actions';
import { addUserToProject } from '@/app/(dashboard)/admin/users/[userId]/actions';
import { InviteMemberDialog } from '@/components/invite-member-dialog';
import { MemberProjectsDialog } from './member-projects-dialog';

const ORG_ROLE_VARIANTS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
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

interface PendingInvitation {
  id: string;
  email: string;
  role: OrgRole;
  created_at: string;
  expires_at: string;
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
  pendingInvitations?: PendingInvitation[];
}

export function OrgDetail({ org, members: initialMembers, projects, storage, pendingInvitations: initialInvitations = [] }: OrgDetailProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const tProjects = useTranslations('projects');
  const [members, setMembers] = useState(initialMembers);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const storageItems = [
    { label: t('storage.photos'), value: storage.photos, icon: Image },
    { label: t('storage.documents'), value: storage.documents, icon: FileText },
    { label: t('storage.plans'), value: storage.sheets, icon: Sheet },
  ];

  const maxStorage = Math.max(storage.total, 1);

  async function handleRoleChange(userId: string, newRole: OrgRole) {
    const result = await updateMemberRole(userId, org.id, newRole);
    if (result.error) { toast.error(result.error); return; }
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
    );
    setOpenMenuId(null);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm(tCommon('confirm') + '?')) return;
    const result = await removeMember(userId, org.id);
    if (result.error) { toast.error(result.error); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    setOpenMenuId(null);
  }

  async function handleCancelInvitation(invId: string) {
    const result = await cancelInvitationFromAdmin(org.id, invId);
    if (result.error) { toast.error(result.error); return; }
    setInvitations((prev) => prev.filter((i) => i.id !== invId));
    toast.success('Pozvánka zrušena');
  }

  async function handleResendInvitation(invId: string) {
    const result = await resendInvitationFromAdmin(org.id, invId);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Pozvánka znovu odeslána');
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
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('members')} ({members.length})</TabsTrigger>
          <TabsTrigger value="projects">{t('orgDetail.projects')} ({projects.length})</TabsTrigger>
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
                  <p className="text-sm text-muted-foreground">{t('members')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('orgDetail.projects')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('storage.title')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                {t('storage.title')} — {formatBytes(storage.total)}
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
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('members')}</h3>
                <Button size="sm" variant="outline" onClick={() => setShowInviteDialog(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Pozvat
                </Button>
              </div>
              <div className="space-y-2">
                {members.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">{tCommon('noResults')}</p>
                )}
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={member.full_name || member.email || '?'} size="sm" />
                      <div>
                        <p className="text-sm font-medium">
                          {member.full_name || member.email || (member.user_id?.slice(0, 8) ?? '?')}
                        </p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ORG_ROLE_VARIANTS[member.role]}>
                        {tRoles(member.role)}
                      </Badge>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === member.user_id ? null : member.user_id);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {openMenuId === member.user_id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                            <p className="px-2 py-1 text-xs text-muted-foreground">{t('orgDetail.changeRole')}</p>
                            {(['owner', 'admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                              <button
                                key={role}
                                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${
                                  member.role === role ? 'font-semibold text-primary' : ''
                                }`}
                                onClick={() => handleRoleChange(member.user_id, role)}
                              >
                                {tRoles(role)}
                                {member.role === role && ' *'}
                              </button>
                            ))}
                            <div className="my-1 border-t" />
                            <button
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <UserMinus className="h-4 w-4" /> {t('orgDetail.removeMember')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Nevyřízené pozvánky</h3>
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-md border border-dashed p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Pozváno {new Date(inv.created_at).toLocaleDateString('cs-CZ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{tRoles(inv.role)}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResendInvitation(inv.id)}
                            title="Znovu odeslat"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelInvitation(inv.id)}
                            title="Zrušit pozvánku"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {projects.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">{tCommon('noResults')}</p>
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
                      {tProjects(`statuses.${project.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Projects Dialog */}
      {selectedMember && (
        <MemberProjectsDialog
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
          orgId={org.id}
        />
      )}

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onInvite={async (email, role, projectAssignments) => {
          const result = await inviteOrgMemberFromAdmin(org.id, email, role);
          if (result.success) {
            if (result.directlyAdded && result.userId && projectAssignments?.length) {
              for (const pa of projectAssignments) {
                await addUserToProject(result.userId, pa.projectId, pa.role as any);
              }
            }
            router.refresh();
          }
          return result;
        }}
      />

    </div>
  );
}
