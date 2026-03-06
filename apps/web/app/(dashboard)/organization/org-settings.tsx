'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, Upload, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { updateOrganization, uploadOrgLogo } from './actions';
import { toast } from 'sonner';

interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
}

interface OrgSettingsProps {
  org: Org;
  isAdmin: boolean;
}

export function OrgSettings({ org, isAdmin }: OrgSettingsProps) {
  const router = useRouter();
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [logoUrl, setLogoUrl] = useState(org.logo_url);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateOrganization(org.id, { name, slug });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('orgUpdated'));
      router.refresh();
    }
    setSaving(false);
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);
    const result = await uploadOrgLogo(org.id, formData);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setLogoUrl(result.data.logo_url);
    }
    setUploadingLogo(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings')}</p>
      </div>

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Logo */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {logoUrl ? (
                <img src={logoUrl} alt={org.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            {isAdmin && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="org-logo-upload"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('org-logo-upload')?.click()}
                  loading={uploadingLogo}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingLogo ? tCommon('loading') : tCommon('upload')}
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t('slug')}</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t('plan')}</Label>
              <Badge variant="secondary">{org.plan}</Badge>
            </div>
            {isAdmin && (
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? tCommon('loading') : tCommon('save')}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
