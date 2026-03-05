'use client';

import { useState, useEffect } from 'react';
import { Trash2, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@joubuild/shared';
import type { Task, TaskCategory, ProjectMember, Tag } from '@joubuild/shared';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TaskComments } from './task-comments';
import { TaskChecklist } from './task-checklist';
import { TagPicker } from '@/components/shared/tag-picker';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task: Task | null;
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  categories?: TaskCategory[];
  members?: (ProjectMember & { full_name?: string | null; email?: string })[];
  tags?: Tag[];
  initialPinX?: number;
  initialPinY?: number;
  initialSheetId?: string;
}

export function TaskDialog({
  open,
  onClose,
  projectId,
  task,
  onCreated,
  onUpdated,
  onDeleted,
  categories = [],
  members = [],
  tags: projectTags = [],
  initialPinX,
  initialPinY,
  initialSheetId,
}: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkedSheetId, setLinkedSheetId] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setStartDate(task.start_date || '');
      setDueDate(task.due_date || '');
      setEstimatedHours(task.estimated_hours?.toString() || '');
      setEstimatedCost(task.estimated_cost?.toString() || '');
      setActualHours(task.actual_hours?.toString() || '0');
      setActualCost(task.actual_cost?.toString() || '0');
      setCategoryId(task.category_id || '');
      setAssigneeId(task.assignee_id || '');

      // Load task tags
      const supabase = getSupabaseClient();
      supabase
        .from('task_tags')
        .select('tag:tags!tag_id(name)')
        .eq('task_id', task.id)
        .then(({ data }) => {
          if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTaskTags(data.map((row: any) => (row.tag as { name: string }).name));
          }
        });
    } else {
      setTitle('');
      setDescription('');
      setStatus('open');
      setPriority('normal');
      setStartDate('');
      setDueDate('');
      setEstimatedHours('');
      setEstimatedCost('');
      setActualHours('');
      setActualCost('');
      setCategoryId('');
      setAssigneeId('');
      setTaskTags([]);
    }
  }, [task]);

  useEffect(() => {
    if (!task?.annotation_id) { setLinkedSheetId(null); return; }
    const supabase = getSupabaseClient();
    supabase
      .from('annotations')
      .select('sheet_versions!inner ( sheets!sheet_id!inner ( id ) )')
      .eq('id', task.annotation_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[TaskDialog] Failed to resolve annotation sheet:', error.message, { annotation_id: task!.annotation_id });
          setLinkedSheetId(null);
          return;
        }
        const sv = data?.sheet_versions as unknown as { sheets: { id: string } } | undefined;
        if (!sv?.sheets.id) {
          console.warn('[TaskDialog] Annotation has no linked sheet', { annotation_id: task!.annotation_id, data });
        }
        setLinkedSheetId(sv?.sheets.id ?? null);
      });
  }, [task?.annotation_id]);

  function handleShowInPlan() {
    if (!task?.annotation_id || !linkedSheetId) return;
    router.push(`/project/${projectId}/plans?sheet=${linkedSheetId}&annotation=${task.annotation_id}`);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();

    const payload = {
      title,
      description: description || null,
      status,
      priority,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      actual_hours: actualHours ? parseFloat(actualHours) : 0,
      actual_cost: actualCost ? parseFloat(actualCost) : 0,
      category_id: categoryId || null,
      assignee_id: assigneeId || null,
    };

    let taskId: string;

    if (task) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', task.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      taskId = data.id;
      onUpdated(data as Task);
      toast.success(t('taskUpdated'));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...payload,
          project_id: projectId,
          created_by: user?.id,
          ...(initialPinX != null ? { pin_x: initialPinX, pin_y: initialPinY, sheet_id: initialSheetId } : {}),
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      taskId = data.id;
      onCreated(data as Task);
      toast.success(t('taskCreated'));
    }

    // Sync task tags
    if (taskTags.length > 0 || task) {
      // Ensure tags exist in the tags table (find-or-create)
      const tagIds: string[] = [];
      for (const tagName of taskTags) {
        const existing = projectTags.find(t => t.name === tagName);
        if (existing) {
          tagIds.push(existing.id);
        } else {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ project_id: projectId, name: tagName })
            .select()
            .single();
          if (newTag) tagIds.push(newTag.id);
        }
      }

      // Remove old tag associations
      await supabase.from('task_tags').delete().eq('task_id', taskId);

      // Insert new associations
      if (tagIds.length > 0) {
        await supabase.from('task_tags').insert(
          tagIds.map(tagId => ({ task_id: taskId, tag_id: tagId }))
        );
      }
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!task) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onDeleted(task.id);
    toast.success(t('taskDeleted'));
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{task ? t('editTask') : t('newTask')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t('titleRequired')}</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('taskName')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{tCommon('description')}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{tCommon('status')}</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`statuses.${s}`)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('priority')}</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{t(`priorities.${p}`)}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>{t('category')}</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{t('noCategoryOption')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>{t('assignee')}</Label>
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">{t('unassignedOption')}</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email || m.user_id.slice(0, 8)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('tagsLabel')}</Label>
          <TagPicker
            tags={taskTags}
            onChange={setTaskTags}
            suggestions={projectTags.map(t => t.name)}
            placeholder={t('addTag')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('startDate')}</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('dueDate')}</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('estimatedHours')}</Label>
            <Input
              type="number"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('estimatedCost')}</Label>
            <Input
              type="number"
              step="100"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {task && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('actualHours')}</Label>
              <Input
                type="number"
                step="0.5"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('actualCost')}</Label>
              <Input
                type="number"
                step="100"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {task && (
          <div className="border-t pt-4">
            <TaskChecklist taskId={task.id} />
          </div>
        )}

        {task && (
          <div className="border-t pt-4">
            <TaskComments taskId={task.id} />
          </div>
        )}

        <div className="flex justify-between border-t pt-4">
          <div className="flex gap-2">
            {task && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                {tCommon('delete')}
              </Button>
            )}
            {task?.annotation_id && linkedSheetId && (
              <Button type="button" variant="outline" size="sm" onClick={handleShowInPlan}>
                <MapPin className="mr-2 h-4 w-4" />
                {t('showInPlan')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? tCommon('saving') : task ? t('updateTask') : t('createTask')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
