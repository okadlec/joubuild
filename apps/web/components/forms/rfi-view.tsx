'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate } from '@joubuild/shared';
import type { Rfi } from '@joubuild/shared';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/hooks/use-permissions';

const STATUS_LABELS: Record<string, string> = {
  open: 'Otevřený',
  answered: 'Zodpovězený',
  closed: 'Uzavřený',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  open: AlertCircle,
  answered: CheckCircle,
  closed: CheckCircle,
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  answered: 'secondary',
  closed: 'outline',
};

interface RfiViewProps {
  projectId: string;
  rfis: Rfi[];
  onRfisChange: (rfis: Rfi[]) => void;
}

export function RfiView({ projectId, rfis, onRfisChange }: RfiViewProps) {
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const { hasPermission } = usePermissions(projectId);
  const canCreate = hasPermission('forms', 'can_create');
  const canEdit = hasPermission('forms', 'can_edit');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRfi, setSelectedRfi] = useState<Rfi | null>(null);
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [answer, setAnswer] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const nextNumber = rfis.length > 0 ? Math.max(...rfis.map(r => r.number)) + 1 : 1;

    const { data, error } = await supabase
      .from('rfis')
      .insert({
        project_id: projectId,
        number: nextNumber,
        subject,
        question,
        status: 'open',
        requested_by: user?.id,
        due_date: dueDate || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    onRfisChange([data as Rfi, ...rfis]);
    setShowCreate(false);
    setSubject('');
    setQuestion('');
    setDueDate('');
    toast.success(t('rfi.created'));
  }

  async function handleAnswer() {
    if (!selectedRfi || !answer.trim()) return;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('rfis')
      .update({
        answer: answer.trim(),
        status: 'answered',
        answered_at: new Date().toISOString(),
      })
      .eq('id', selectedRfi.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    onRfisChange(rfis.map(r => r.id === selectedRfi.id ? { ...r, answer: answer.trim(), status: 'answered' as const, answered_at: new Date().toISOString() } : r));
    setSelectedRfi(null);
    setAnswer('');
    toast.success(t('rfi.answerSaved'));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('rfi.title', { count: rfis.length })}</h3>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('rfi.newRfi')}
          </Button>
        )}
      </div>

      {rfis.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-1 font-medium">{t('rfi.noRfis')}</p>
          <p className="text-sm text-muted-foreground">{t('rfi.noRfisHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rfis.map((rfi) => {
            const StatusIcon = STATUS_ICONS[rfi.status] || Clock;
            return (
              <Card key={rfi.id} className="cursor-pointer hover:shadow-sm" onClick={() => { setSelectedRfi(rfi); setAnswer(rfi.answer || ''); }}>
                <CardContent className="flex items-center gap-3 p-3">
                  <StatusIcon className={`h-5 w-5 shrink-0 ${rfi.status === 'open' ? 'text-yellow-500' : 'text-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">RFI-{String(rfi.number).padStart(3, '0')}</span>
                      <p className="font-medium truncate">{rfi.subject}</p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{rfi.question}</p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[rfi.status]}>{t(`rfi.statuses.${rfi.status}`)}</Badge>
                  {rfi.due_date && (
                    <span className="text-xs text-muted-foreground">{formatDate(rfi.due_date)}</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>{t('rfi.newRfi')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('rfi.subject')}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('rfi.subjectPlaceholder')} required />
          </div>
          <div className="space-y-2">
            <Label>{t('rfi.question')}</Label>
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t('rfi.questionPlaceholder')} required />
          </div>
          <div className="space-y-2">
            <Label>{t('rfi.answerDeadline')}</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{tCommon('cancel')}</Button>
            <Button type="submit">{tCommon('create')}</Button>
          </div>
        </form>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selectedRfi} onClose={() => setSelectedRfi(null)} className="max-w-lg">
        {selectedRfi && (
          <>
            <DialogHeader>
              <DialogTitle>RFI-{String(selectedRfi.number).padStart(3, '0')}: {selectedRfi.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t('rfi.questionLabel')}</Label>
                <p className="mt-1 text-sm">{selectedRfi.question}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('rfi.answerLabel')}</Label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t('rfi.answerPlaceholder')}
                  disabled={selectedRfi.status === 'closed' || !canEdit}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRfi(null)}>{tCommon('close')}</Button>
                {selectedRfi.status !== 'closed' && canEdit && (
                  <Button onClick={handleAnswer} disabled={!answer.trim()}>
                    {t('rfi.answerButton')}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
