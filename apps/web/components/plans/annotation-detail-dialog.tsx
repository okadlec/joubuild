'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, MessageSquare, Camera, CheckSquare, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TASK_STATUS_COLORS } from '@joubuild/shared';
import type { Task } from '@joubuild/shared';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { AnnotationChatPanel } from './annotation-chat-panel';
import { AnnotationPhotosPanel } from './annotation-photos-panel';
import { AnnotationTaskAttributes } from './annotation-task-attributes';
import { TaskChecklist } from '@/components/tasks/task-checklist';

type Tab = 'chat' | 'photos' | 'attributes';

interface AnnotationDetailDialogProps {
  annotationId: string;
  projectId: string;
  sheetVersionId: string;
  initialTab?: Tab;
  onClose: () => void;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (id: string) => void;
}

export function AnnotationDetailDialog({
  annotationId,
  projectId,
  sheetVersionId,
  onClose,
  initialTab,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: AnnotationDetailDialogProps) {
  const t = useTranslations('plans.annotationDetail');
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'chat');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [commentCount, setCommentCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const isMobile = useIsMobile();

  const selectedTask = linkedTasks.find(t => t.id === selectedTaskId) ?? null;

  // Load linked tasks
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('tasks')
      .select('*')
      .eq('annotation_id', annotationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const tasks = data as Task[];
          setLinkedTasks(tasks);
          setSelectedTaskId(tasks[0].id);
          setTitleValue(tasks[0].title);
        }
      });

    // Load counts for tab badges
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('annotation_id', annotationId)
      .then(({ count }) => { if (count != null) setCommentCount(count); });

    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('annotation_id', annotationId)
      .then(({ count }) => { if (count != null) setPhotoCount(count); });
  }, [annotationId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleTitleSave = useCallback(async () => {
    if (!selectedTask || !titleValue.trim()) {
      setEditingTitle(false);
      return;
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .update({ title: titleValue.trim(), updated_at: new Date().toISOString() })
      .eq('id', selectedTask.id)
      .select()
      .single();

    if (error) {
      setTitleValue(selectedTask.title);
    } else {
      const updated = data as Task;
      setLinkedTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      onTaskUpdated?.(updated);
    }
    setEditingTitle(false);
  }, [selectedTask, titleValue, onTaskUpdated]);

  const handleTaskCreated = useCallback((task: Task) => {
    setLinkedTasks(prev => [...prev, task]);
    setSelectedTaskId(task.id);
    setTitleValue(task.title);
    onTaskCreated?.(task);
  }, [onTaskCreated]);

  const handleTaskUpdated = useCallback((task: Task) => {
    setLinkedTasks(prev => prev.map(t => t.id === task.id ? task : t));
    if (task.id === selectedTaskId) {
      setTitleValue(task.title);
    }
    onTaskUpdated?.(task);
  }, [onTaskUpdated, selectedTaskId]);

  const handleTaskDeleted = useCallback((id: string) => {
    setLinkedTasks(prev => {
      const remaining = prev.filter(t => t.id !== id);
      if (id === selectedTaskId) {
        const next = remaining[0] ?? null;
        setSelectedTaskId(next?.id ?? null);
        setTitleValue(next?.title ?? '');
      }
      return remaining;
    });
    onTaskDeleted?.(id);
  }, [onTaskDeleted, selectedTaskId]);

  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    setTitleValue(task.title);
    setEditingTitle(false);
  }, []);

  const tabs = [
    { id: 'chat' as Tab, label: t('chat'), icon: MessageSquare, count: commentCount },
    { id: 'photos' as Tab, label: t('photos'), icon: Camera, count: photoCount },
    ...(isMobile ? [{ id: 'attributes' as Tab, label: t('attributes'), icon: Settings2, count: 0 }] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          'fixed z-[70] bg-background shadow-xl animate-in fade-in-0 zoom-in-95',
          isMobile
            ? 'inset-x-2 inset-y-4 rounded-xl'
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-5xl h-[85vh] rounded-xl'
        )}
      >
        <div className="flex h-full flex-col lg:flex-row">
          {/* Left column — header + tabs + content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              {selectedTask && (
                <Badge
                  className="shrink-0 text-white text-xs"
                  style={{ backgroundColor: TASK_STATUS_COLORS[selectedTask.status] || '#3B82F6' }}
                >
                  #{selectedTask.id.slice(0, 6)}
                </Badge>
              )}
              {linkedTasks.length > 1 && (
                <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5">
                  {linkedTasks.length}
                </Badge>
              )}

              <div className="flex-1 min-w-0">
                {selectedTask ? (
                  editingTitle ? (
                    <Input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave();
                        if (e.key === 'Escape') { setTitleValue(selectedTask.title); setEditingTitle(false); }
                      }}
                      className="h-8 text-sm font-semibold"
                      autoFocus
                    />
                  ) : (
                    <h3
                      className="cursor-pointer truncate text-sm font-semibold hover:text-primary"
                      onClick={() => setEditingTitle(true)}
                      title={t('clickToEdit')}
                    >
                      {selectedTask.title}
                    </h3>
                  )
                ) : (
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t('title')}
                  </h3>
                )}
              </div>

              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'chat' && (
                <AnnotationChatPanel
                  annotationId={annotationId}
                  projectId={projectId}
                />
              )}
              {activeTab === 'photos' && (
                <AnnotationPhotosPanel
                  annotationId={annotationId}
                  projectId={projectId}
                />
              )}
              {activeTab === 'attributes' && isMobile && (
                <AnnotationTaskAttributes
                  annotationId={annotationId}
                  projectId={projectId}
                  linkedTasks={linkedTasks}
                  selectedTask={selectedTask}
                  onSelectTask={handleSelectTask}
                  onTaskCreated={handleTaskCreated}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskDeleted={handleTaskDeleted}
                />
              )}
            </div>

            {/* Checklist — always visible below tabs on desktop when task exists */}
            {selectedTask && activeTab === 'chat' && (
              <div className="border-t px-4 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{t('checklist')}</span>
                </div>
                <TaskChecklist taskId={selectedTask.id} />
              </div>
            )}
          </div>

          {/* Right column — task attributes (desktop only) */}
          {!isMobile && (
            <div className="w-80 shrink-0 border-l overflow-auto">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="text-sm font-semibold">{t('taskAttributes')}</h4>
              </div>
              <AnnotationTaskAttributes
                annotationId={annotationId}
                projectId={projectId}
                linkedTasks={linkedTasks}
                selectedTask={selectedTask}
                onSelectTask={handleSelectTask}
                onTaskCreated={handleTaskCreated}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
