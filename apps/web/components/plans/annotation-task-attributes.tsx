'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from '@joubuild/shared';
import type { Task, TaskCategory, Tag } from '@joubuild/shared';
import { toast } from 'sonner';
import { TagPicker } from '@/components/shared/tag-picker';
import { AnnotationPlanPreview } from '@/components/photos/annotation-plan-preview';

interface MemberInfo {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface PlanPreviewData {
  annotationType: string;
  annotationData: Record<string, unknown>;
  sheetId: string;
  sheetName: string;
  thumbnailUrl: string | null;
  sheetWidth: number | null;
  sheetHeight: number | null;
  planSetName: string | null;
}

interface AnnotationTaskAttributesProps {
  annotationId: string;
  projectId: string;
  linkedTask: Task | null;
  onTaskCreated: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (id: string) => void;
}

export function AnnotationTaskAttributes({
  annotationId,
  projectId,
  linkedTask,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: AnnotationTaskAttributesProps) {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [planPreviewData, setPlanPreviewData] = useState<PlanPreviewData | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load categories, members, tags, plan preview
  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase
      .from('task_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .then(({ data }) => { if (data) setCategories(data); });

    supabase
      .from('project_members')
      .select('user_id, profiles:user_id(full_name, email)')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMembers(data.map((m: any) => ({
            user_id: m.user_id,
            full_name: m.profiles?.full_name ?? null,
            email: m.profiles?.email ?? m.user_id.slice(0, 8),
          })));
        }
      });

    supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .then(({ data }) => { if (data) setProjectTags(data); });

    // Load plan preview data
    supabase
      .from('annotations')
      .select(`
        type, data,
        sheet_versions!inner (
          thumbnail_url, width, height,
          sheets!inner ( id, name, plan_sets ( name ) )
        )
      `)
      .eq('id', annotationId)
      .maybeSingle()
      .then(({ data: annData }) => {
        if (annData) {
          const sv = annData.sheet_versions as unknown as {
            thumbnail_url: string | null;
            width: number | null;
            height: number | null;
            sheets: { id: string; name: string; plan_sets: { name: string } | null };
          };
          setPlanPreviewData({
            annotationType: annData.type as string,
            annotationData: (annData.data ?? {}) as Record<string, unknown>,
            sheetId: sv.sheets.id,
            sheetName: sv.sheets.name,
            thumbnailUrl: sv.thumbnail_url,
            sheetWidth: sv.width,
            sheetHeight: sv.height,
            planSetName: sv.sheets.plan_sets?.name ?? null,
          });
        }
      });
  }, [annotationId, projectId]);

  // Load task tags when linked task changes
  useEffect(() => {
    if (!linkedTask) {
      setTaskTags([]);
      return;
    }
    const supabase = getSupabaseClient();
    supabase
      .from('task_tags')
      .select('tag:tags!tag_id(name)')
      .eq('task_id', linkedTask.id)
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setTaskTags(data.map((row: any) => (row.tag as { name: string }).name));
        }
      });
  }, [linkedTask?.id]);

  const autoSaveField = useCallback(async (field: string, value: unknown) => {
    if (!linkedTask) return;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', linkedTask.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }
    onTaskUpdated(data as Task);
  }, [linkedTask, onTaskUpdated]);

  const debouncedSave = useCallback((field: string, value: unknown) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => autoSaveField(field, value), 800);
  }, [autoSaveField]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        annotation_id: annotationId,
        title: newTaskTitle.trim(),
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }
    onTaskCreated(data as Task);
    setNewTaskTitle('');
    setCreating(false);
    toast.success('Úkol vytvořen');
  }, [projectId, annotationId, newTaskTitle, onTaskCreated]);

  const handleDeleteTask = useCallback(async () => {
    if (!linkedTask) return;
    if (!confirm('Opravdu chcete smazat tento úkol?')) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('tasks').delete().eq('id', linkedTask.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onTaskDeleted(linkedTask.id);
    toast.success('Úkol smazán');
  }, [linkedTask, onTaskDeleted]);

  const handleTagsChange = useCallback(async (newTags: string[]) => {
    if (!linkedTask) return;
    setTaskTags(newTags);

    const supabase = getSupabaseClient();
    const tagIds: string[] = [];
    for (const tagName of newTags) {
      const existing = projectTags.find(t => t.name === tagName);
      if (existing) {
        tagIds.push(existing.id);
      } else {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ project_id: projectId, name: tagName })
          .select()
          .single();
        if (newTag) {
          tagIds.push(newTag.id);
          setProjectTags(prev => [...prev, newTag]);
        }
      }
    }

    await supabase.from('task_tags').delete().eq('task_id', linkedTask.id);
    if (tagIds.length > 0) {
      await supabase.from('task_tags').insert(
        tagIds.map(tagId => ({ task_id: linkedTask.id, tag_id: tagId }))
      );
    }
  }, [linkedTask, projectTags, projectId]);

  // No linked task — show create form
  if (!linkedTask) {
    return (
      <div className="space-y-4 p-4">
        {planPreviewData && (
          <div className="mb-4">
            <Label className="mb-1.5 text-xs text-muted-foreground">Plán</Label>
            <AnnotationPlanPreview
              projectId={projectId}
              sheetId={planPreviewData.sheetId}
              sheetName={planPreviewData.sheetName}
              annotationId={annotationId}
              annotationType={planPreviewData.annotationType}
              annotationData={planPreviewData.annotationData}
              thumbnailUrl={planPreviewData.thumbnailUrl}
              sheetWidth={planPreviewData.sheetWidth}
              sheetHeight={planPreviewData.sheetHeight}
              planSetName={planPreviewData.planSetName}
            />
          </div>
        )}

        <div className="rounded-lg border border-dashed p-4 text-center">
          <CheckSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="mb-3 text-sm text-muted-foreground">Žádný propojený úkol</p>
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Název úkolu..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask(); }}
            />
            <Button size="sm" onClick={handleCreateTask} disabled={creating || !newTaskTitle.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Vytvořit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Linked task — show attributes
  return (
    <div className="space-y-3 p-4">
      {/* Status */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <div className="flex gap-1.5 flex-wrap">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => autoSaveField('status', s)}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: linkedTask.status === s ? TASK_STATUS_COLORS[s] : undefined,
                color: linkedTask.status === s ? '#fff' : TASK_STATUS_COLORS[s],
                border: `1px solid ${TASK_STATUS_COLORS[s]}`,
              }}
            >
              {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Priorita</Label>
        <Select
          value={linkedTask.priority}
          onChange={(e) => autoSaveField('priority', e.target.value)}
          className="h-8 text-sm"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
          ))}
        </Select>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Kategorie</Label>
          <Select
            value={linkedTask.category_id || ''}
            onChange={(e) => autoSaveField('category_id', e.target.value || null)}
            className="h-8 text-sm"
          >
            <option value="">— Bez kategorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Assignee */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Zodpovědná osoba</Label>
        <Select
          value={linkedTask.assignee_id || ''}
          onChange={(e) => autoSaveField('assignee_id', e.target.value || null)}
          className="h-8 text-sm"
        >
          <option value="">— Nepřiřazeno —</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name || m.email}
            </option>
          ))}
        </Select>
      </div>

      {/* Plan preview */}
      {planPreviewData && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Plán</Label>
          <AnnotationPlanPreview
            projectId={projectId}
            sheetId={planPreviewData.sheetId}
            sheetName={planPreviewData.sheetName}
            annotationId={annotationId}
            annotationType={planPreviewData.annotationType}
            annotationData={planPreviewData.annotationData}
            thumbnailUrl={planPreviewData.thumbnailUrl}
            sheetWidth={planPreviewData.sheetWidth}
            sheetHeight={planPreviewData.sheetHeight}
            planSetName={planPreviewData.planSetName}
          />
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Začátek</Label>
          <Input
            type="date"
            value={linkedTask.start_date || ''}
            onChange={(e) => autoSaveField('start_date', e.target.value || null)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Termín</Label>
          <Input
            type="date"
            value={linkedTask.due_date || ''}
            onChange={(e) => autoSaveField('due_date', e.target.value || null)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Hours & Costs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Odhad hodin</Label>
          <Input
            type="number"
            step="0.5"
            value={linkedTask.estimated_hours ?? ''}
            onChange={(e) => debouncedSave('estimated_hours', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-sm"
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Odhad nákladů</Label>
          <Input
            type="number"
            step="100"
            value={linkedTask.estimated_cost ?? ''}
            onChange={(e) => debouncedSave('estimated_cost', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-sm"
            placeholder="0 Kč"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Tagy</Label>
        <TagPicker
          tags={taskTags}
          onChange={handleTagsChange}
          suggestions={projectTags.map(t => t.name)}
          placeholder="Přidat tag..."
        />
      </div>

      {/* Delete task */}
      <div className="border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDeleteTask}
        >
          Smazat úkol
        </Button>
      </div>
    </div>
  );
}
