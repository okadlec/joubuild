'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, UserPlus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PROJECT_ROLE_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUSES, type TaskCategory } from '@joubuild/shared';
import { toast } from 'sonner';
import { CategoryManager } from '@/components/tasks/category-manager';
import { ProjectRolePermissionsInfo } from '@/components/shared/role-permissions-info';
import { PermissionMatrix } from '@/components/settings/permission-matrix';
import { addMember, removeMember, deleteProject, searchUsers, updateMemberRole } from './actions';
import { compressImage } from '@/lib/compress-image';
import type { ProjectMemberPermission, FolderPermission, ProjectRole } from '@joubuild/shared';

interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: string;
  cover_image_url: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
}

interface FolderInfo {
  id: string;
  name: string;
  parent_id: string | null;
}

export function ProjectSettings({
  project,
  members: initialMembers,
  currentUserId,
  initialCategories = [],
  initialPermissions = [],
  initialFolderPermissions = [],
  folders = [],
}: {
  project: Project;
  members: Member[];
  currentUserId?: string;
  initialCategories?: TaskCategory[];
  initialPermissions?: ProjectMemberPermission[];
  initialFolderPermissions?: FolderPermission[];
  folders?: FolderInfo[];
}) {
  const router = useRouter();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tProjects = useTranslations('projects');
  const tRoles = useTranslations('roles');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [address, setAddress] = useState(project.address || '');
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>(initialCategories);
  const [memberList, setMemberList] = useState<Member[]>(initialMembers);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [showUserResults, setShowUserResults] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowUserResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('projects')
      .update({
        name,
        description: description || null,
        address: address || null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('saved'));
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(t('deleteProjectConfirm'))) return;

    const result = await deleteProject(project.id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('projectDeleted'));
    router.push('/projects');
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      const supabase = getSupabaseClient();
      const path = `${project.id}/cover-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('projects')
        .update({ cover_image_url: publicUrl })
        .eq('id', project.id);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      setCoverImageUrl(publicUrl);
      router.refresh();
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleCoverRemove() {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('projects')
      .update({ cover_image_url: null })
      .eq('id', project.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setCoverImageUrl(null);
    router.refresh();
  }

  const doSearch = useCallback(async (q: string) => {
    setSearchingUsers(true);
    const result = await searchUsers(project.id, q);
    setUserResults(result.data);
    setShowUserResults(true);
    setSearchingUsers(false);
  }, [project.id]);

  useEffect(() => {
    if (showAddMember) {
      doSearch('');
    }
  }, [showAddMember, doSearch]);

  function handleUserQueryChange(value: string) {
    setUserQuery(value);
    setNewMemberEmail(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleSelectUser(user: { id: string; email: string; full_name: string | null }) {
    setNewMemberEmail(user.email);
    setUserQuery(user.full_name ? `${user.full_name} (${user.email})` : user.email);
    setShowUserResults(false);
  }

  async function handleInvite() {
    if (!newMemberEmail.trim()) {
      toast.error(t('enterEmail'));
      return;
    }

    setInviting(true);
    const result = await addMember(project.id, newMemberEmail.trim(), newMemberRole);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('memberAdded'));
      setShowAddMember(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      setUserQuery('');
      setUserResults([]);
      router.refresh();
    }
    setInviting(false);
  }

  async function handleRemoveMember(userId: string) {
    setRemovingMemberId(userId);
    const result = await removeMember(project.id, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('memberRemoved'));
      setMemberList((prev) => prev.filter((m) => m.user_id !== userId));
    }
    setRemovingMemberId(null);
  }

  async function handleMemberRoleChange(userId: string, newRole: ProjectRole) {
    const result = await updateMemberRole(project.id, userId, newRole);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t('roleUpdated'));
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('generalSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('coverImage')}</Label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-40 overflow-hidden rounded-lg border bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {coverImageUrl ? (
                  <img src={coverImageUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-primary/60 text-center px-2">{name}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingCover ? t('uploadingCover') : t('uploadCover')}
                </Button>
                {coverImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCoverRemove}
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t('removeCover')}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('projectName')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('descriptionLabel')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('addressLabel')}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('statusLabel')}</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{tProjects(`statuses.${s}`)}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('members')}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('addMember')}
          </Button>
        </CardHeader>
        <CardContent>
          {memberList.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
          ) : (
            <div className="space-y-2">
              {memberList.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.full_name || member.email || '?'} size="sm" />
                    <div>
                      <p className="text-sm font-medium">
                        {member.full_name || member.email || (member.user_id?.slice(0, 8) ?? '?')}
                      </p>
                      {member.full_name && member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {tRoles(member.role)}
                    </Badge>
                    <ProjectRolePermissionsInfo />
                    {member.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={removingMemberId === member.user_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryManager
        projectId={project.id}
        categories={taskCategories}
        onCategoriesChange={setTaskCategories}
      />

      <PermissionMatrix
        projectId={project.id}
        members={memberList}
        initialPermissions={initialPermissions}
        initialFolderPermissions={initialFolderPermissions}
        folders={folders}
        onMemberRoleChange={handleMemberRoleChange}
      />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t('dangerZone')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('deleteProject')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showAddMember} onClose={() => { setShowAddMember(false); setUserQuery(''); setUserResults([]); setShowUserResults(false); }}>
        <DialogHeader>
          <DialogTitle>{t('addMember')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('userLabel')}</Label>
            <div className="relative">
              <Input
                value={userQuery}
                onChange={(e) => handleUserQueryChange(e.target.value)}
                onFocus={() => { if (userResults.length > 0) setShowUserResults(true); else doSearch(userQuery); }}
                placeholder={t('filterUsers')}
                autoComplete="off"
              />
              {showUserResults && (
                <div
                  ref={resultsRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-background shadow-md"
                >
                  {searchingUsers ? (
                    <div className="p-3 text-sm text-muted-foreground">{t('searching')}</div>
                  ) : userResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">{t('noUsersFound')}</div>
                  ) : (
                    userResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                        onClick={() => handleSelectUser(u)}
                      >
                        <Avatar name={u.full_name || u.email} size="sm" />
                        <div className="min-w-0">
                          {u.full_name && <p className="text-sm font-medium truncate">{u.full_name}</p>}
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('roleLabel')}</Label>
            <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
              <option value="admin">{tRoles('administrator')}</option>
              <option value="member">{tRoles('member')}</option>
              <option value="follower">{tRoles('follower')}</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowAddMember(false); setUserQuery(''); setUserResults([]); setShowUserResults(false); }}>{tCommon('cancel')}</Button>
            <Button onClick={handleInvite} loading={inviting}>
              {inviting ? t('adding') : t('add')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
