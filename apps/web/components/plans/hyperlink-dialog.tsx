'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Hyperlink } from '@joubuild/shared';

interface HyperlinkDialogProps {
  open: boolean;
  onClose: () => void;
  sheetVersionId: string;
  hyperlink?: Hyperlink | null;
  position?: { x: number; y: number; width: number; height: number };
  onCreated?: (hyperlink: Hyperlink) => void;
  onDeleted?: (id: string) => void;
  readOnly?: boolean;
}

export function HyperlinkDialog({
  open,
  onClose,
  sheetVersionId,
  hyperlink,
  position,
  onCreated,
  onDeleted,
  readOnly = false,
}: HyperlinkDialogProps) {
  const t = useTranslations('plans.hyperlinks');
  const tCommon = useTranslations('common');
  const [targetType, setTargetType] = useState<'sheet' | 'document' | 'url'>(hyperlink?.target_type || 'url');
  const [targetUrl, setTargetUrl] = useState(hyperlink?.target_url || '');
  const [label, setLabel] = useState(hyperlink?.label || '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      sheet_version_id: sheetVersionId,
      x: position?.x || hyperlink?.x || 0,
      y: position?.y || hyperlink?.y || 0,
      width: position?.width || hyperlink?.width || 100,
      height: position?.height || hyperlink?.height || 30,
      target_type: targetType,
      target_url: targetType === 'url' ? targetUrl : null,
      target_id: null,
      label: label || null,
      created_by: user?.id,
    };

    if (hyperlink) {
      const { error } = await supabase
        .from('hyperlinks')
        .update(payload)
        .eq('id', hyperlink.id);
      if (error) toast.error(error.message);
      else { toast.success(t('updated')); onClose(); }
    } else {
      const { data, error } = await supabase
        .from('hyperlinks')
        .insert(payload)
        .select()
        .single();
      if (error) toast.error(error.message);
      else {
        toast.success(t('created'));
        onCreated?.(data as Hyperlink);
        onClose();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!hyperlink) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('hyperlinks').delete().eq('id', hyperlink.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t('deleted'));
      onDeleted?.(hyperlink.id);
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{hyperlink ? t('editTitle') : t('createTitle')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label>{t('targetType')}</Label>
          <Select value={targetType} onChange={(e) => setTargetType(e.target.value as 'sheet' | 'document' | 'url')} disabled={readOnly}>
            <option value="url">{t('targetUrl')}</option>
            <option value="sheet">{t('targetSheet')}</option>
            <option value="document">{t('targetDocument')}</option>
          </Select>
        </div>

        {targetType === 'url' && (
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..."
              required
              disabled={readOnly}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>{t('label')}</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('labelPlaceholder')}
            disabled={readOnly}
          />
        </div>

        <div className="flex justify-between">
          {hyperlink && !readOnly && (
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
              {tCommon('delete')}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{readOnly ? tCommon('close') : tCommon('cancel')}</Button>
            {!readOnly && (
              <Button type="submit" loading={saving}>
                {saving ? tCommon('saving') : tCommon('save')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
