'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, UserPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PROJECT_ROLE_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUSES, type TaskCategory } from '@joubuild/shared';
import { toast } from 'sonner';
import { CategoryManager } from '@/components/tasks/category-manager';

interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
}

export function ProjectSettings({ project, members, initialCategories = [] }: { project: Project; members: Member[]; initialCategories?: TaskCategory[] }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [address, setAddress] = useState(project.address || '');
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>(initialCategories);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

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
      toast.success('Nastavení uloženo');
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Opravdu chcete smazat tento projekt? Tato akce je nevratná.')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('projects').delete().eq('id', project.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Projekt smazán');
    router.push('/projects');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nastavení projektu</h1>
        <p className="text-sm text-muted-foreground">Úprava detailů a správa členů projektu</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Obecné</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Název projektu</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adresa</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Ukládání...' : 'Uložit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Členové</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Přidat
          </Button>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádní členové</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{member.user_id.slice(0, 8)}...</p>
                  </div>
                  <Badge variant="secondary">
                    {PROJECT_ROLE_LABELS[member.role] || member.role}
                  </Badge>
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

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Nebezpečná zóna</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat projekt
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showAddMember} onClose={() => setShowAddMember(false)}>
        <DialogHeader>
          <DialogTitle>Přidat člena</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
              <option value="admin">Administrátor</option>
              <option value="member">Člen</option>
              <option value="follower">Sledující</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Zrušit</Button>
            <Button onClick={() => { toast.info('Pozvánka odeslána'); setShowAddMember(false); }}>
              Pozvat
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
