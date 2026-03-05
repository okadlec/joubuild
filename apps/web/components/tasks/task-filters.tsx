'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskCategory,
  type ProjectMember,
} from '@joubuild/shared';

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  categoryId: string;
  assigneeId: string;
}

export const EMPTY_FILTERS: TaskFilters = {
  search: '',
  status: '',
  priority: '',
  categoryId: '',
  assigneeId: '',
};

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  categories?: TaskCategory[];
  members?: (ProjectMember & { full_name?: string | null; email?: string })[];
}

export function TaskFiltersBar({ filters, onChange, categories = [], members = [] }: TaskFiltersBarProps) {
  const t = useTranslations('tasks.filters');
  const activeCount = Object.values(filters).filter(v => v !== '').length;

  function update(partial: Partial<TaskFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-8 w-48"
        />

        <Select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          className="h-8 w-auto"
        >
          <option value="">{t('allStatuses')}</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
          ))}
        </Select>

        <Select
          value={filters.priority}
          onChange={(e) => update({ priority: e.target.value })}
          className="h-8 w-auto"
        >
          <option value="">{t('allPriorities')}</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
          ))}
        </Select>

        {categories.length > 0 && (
          <Select
            value={filters.categoryId}
            onChange={(e) => update({ categoryId: e.target.value })}
            className="h-8 w-auto"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

        {members.length > 0 && (
          <Select
            value={filters.assigneeId}
            onChange={(e) => update({ assigneeId: e.target.value })}
            className="h-8 w-auto"
          >
            <option value="">{t('allAssignees')}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name || m.email || m.user_id.slice(0, 8)}
              </option>
            ))}
          </Select>
        )}

        {activeCount > 0 && (
          <>
            <Badge variant="secondary">{t('activeFilters', { count: activeCount })}</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onChange(EMPTY_FILTERS)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t('clearFilters')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
