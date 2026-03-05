'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, Upload, KeyRound, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
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
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
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
      toast.success(t('profileSaved'));
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
      toast.success(t('avatarUploaded'));
      router.refresh();
    }
    setUploadingAvatar(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t('passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setChangingPassword(true);
    const result = await changePassword(newPassword);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('passwordChanged'));
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('personalInfo')}</CardTitle>
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
                {uploadingAvatar ? t('uploadingAvatar') : t('changeAvatar')}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>{tCommon('email')}</Label>
              <Input value={profile.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            {orgName && (
              <div className="space-y-2">
                <Label>{t('organization')}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{orgName}</span>
                  {orgRole && <Badge variant="secondary">{orgRole}</Badge>}
                </div>
              </div>
            )}
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? tCommon('saving') : tCommon('save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>{t('changePassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              <KeyRound className="mr-2 h-4 w-4" />
              {changingPassword ? t('changingPassword') : t('changePasswordButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t('language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">{t('languageDescription')}</p>
          <LanguageSwitcher />
        </CardContent>
      </Card>
    </div>
  );
}
