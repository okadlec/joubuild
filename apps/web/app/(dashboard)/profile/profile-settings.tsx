'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { updateProfile, changePassword, uploadAvatar } from './actions';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  orgName: string | null;
  orgRole: string | null;
}

export function ProfileSettings({ profile, orgName, orgRole }: ProfileSettingsProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({ full_name: fullName });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Profil uložen');
      router.refresh();
    }
    setSaving(false);
  }

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    const result = await uploadAvatar(formData);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setAvatarUrl(result.data.avatar_url);
      toast.success('Avatar nahrán');
      router.refresh();
    }
    setUploadingAvatar(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Hesla se neshodují');
      return;
    }
    setChangingPassword(true);
    const result = await changePassword(newPassword);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Heslo změněno');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">Osobní nastavení účtu</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>Osobní údaje</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Avatar */}
          <div className="mb-4 flex items-center gap-4">
            <Avatar
              name={fullName || profile.email || '?'}
              src={avatarUrl}
              size="lg"
            />
            <div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="avatar-upload"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingAvatar ? 'Nahrávání...' : 'Změnit avatar'}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Jméno</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Vaše jméno"
              />
            </div>
            {orgName && (
              <div className="space-y-2">
                <Label>Organizace</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{orgName}</span>
                  {orgRole && <Badge variant="secondary">{orgRole}</Badge>}
                </div>
              </div>
            )}
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Ukládání...' : 'Uložit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Změna hesla</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Nové heslo</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nové heslo"
              />
            </div>
            <div className="space-y-2">
              <Label>Potvrzení hesla</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Zopakujte nové heslo"
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              <KeyRound className="mr-2 h-4 w-4" />
              {changingPassword ? 'Měním...' : 'Změnit heslo'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
