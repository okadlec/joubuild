'use client';

import { useState } from 'react';
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
}

export function HyperlinkDialog({
  open,
  onClose,
  sheetVersionId,
  hyperlink,
  position,
  onCreated,
  onDeleted,
}: HyperlinkDialogProps) {
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
      else { toast.success('Hyperlink aktualizován'); onClose(); }
    } else {
      const { data, error } = await supabase
        .from('hyperlinks')
        .insert(payload)
        .select()
        .single();
      if (error) toast.error(error.message);
      else {
        toast.success('Hyperlink vytvořen');
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
      toast.success('Hyperlink smazán');
      onDeleted?.(hyperlink.id);
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{hyperlink ? 'Upravit hyperlink' : 'Nový hyperlink'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label>Typ cíle</Label>
          <Select value={targetType} onChange={(e) => setTargetType(e.target.value as 'sheet' | 'document' | 'url')}>
            <option value="url">URL adresa</option>
            <option value="sheet">Výkres</option>
            <option value="document">Dokument</option>
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
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Popisek</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Popis hyperlinku"
          />
        </div>

        <div className="flex justify-between">
          {hyperlink && (
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
              Smazat
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Ukládání...' : 'Uložit'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
