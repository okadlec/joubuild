'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  restoreProject,
  restorePlanSet,
  permanentDeleteProject,
  permanentDeletePlanSet,
  purgeExpired,
} from './actions';

interface DeletedProject {
  id: string;
  name: string;
  deleted_at: string;
  organization_id: string | null;
}

interface DeletedPlanSet {
  id: string;
  name: string;
  deleted_at: string;
  project_name: string | null;
  project_id: string;
}

interface TrashViewProps {
  projects: DeletedProject[];
  planSets: DeletedPlanSet[];
}

function getDaysRemaining(deletedAt: string, retentionDays = 30): number {
  const deleted = new Date(deletedAt);
  const expiry = new Date(deleted.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function TrashView({ projects: initialProjects, planSets: initialPlanSets }: TrashViewProps) {
  const t = useTranslations('trash');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(initialProjects);
  const [planSets, setPlanSets] = useState(initialPlanSets);

  const handleRestore = async (type: 'project' | 'planSet', id: string) => {
    const result = type === 'project'
      ? await restoreProject(id)
      : await restorePlanSet(id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (type === 'project') {
      setProjects(prev => prev.filter(p => p.id !== id));
    } else {
      setPlanSets(prev => prev.filter(ps => ps.id !== id));
    }
    toast.success(t('restored'));
  };

  const handlePermanentDelete = async (type: 'project' | 'planSet', id: string) => {
    if (!confirm(t('permanentDeleteConfirm'))) return;

    const result = type === 'project'
      ? await permanentDeleteProject(id)
      : await permanentDeletePlanSet(id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (type === 'project') {
      setProjects(prev => prev.filter(p => p.id !== id));
    } else {
      setPlanSets(prev => prev.filter(ps => ps.id !== id));
    }
    toast.success(t('permanentlyDeleted'));
  };

  const handlePurge = async () => {
    if (!confirm(t('purgeConfirm'))) return;

    startTransition(async () => {
      const result = await purgeExpired();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('purged'));
      router.refresh();
    });
  };

  const isEmpty = projects.length === 0 && planSets.length === 0;
  const hasExpired = projects.some(p => getDaysRemaining(p.deleted_at) === 0)
    || planSets.some(ps => getDaysRemaining(ps.deleted_at) === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {hasExpired && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handlePurge}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('purgeExpired')}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Trash2 className="mb-4 h-12 w-12" />
            <p>{t('noItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">
              {t('projects')} ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="planSets">
              {t('planSets')} ({planSets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {projects.map(project => {
                    const days = getDaysRemaining(project.deleted_at);
                    return (
                      <div key={project.id} className="flex items-center justify-between p-4">
                        <div className="space-y-1">
                          <p className="font-medium">{project.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {t('deletedAt')}: {new Date(project.deleted_at).toLocaleDateString('cs-CZ')}
                            </span>
                            {days > 0 ? (
                              <Badge variant="secondary">
                                {t('daysRemaining', { days })}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                {t('expired')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore('project', project.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            {t('restore')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete('project', project.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            {t('permanentDelete')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {projects.length === 0 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">{t('noItems')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planSets">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {planSets.map(planSet => {
                    const days = getDaysRemaining(planSet.deleted_at);
                    return (
                      <div key={planSet.id} className="flex items-center justify-between p-4">
                        <div className="space-y-1">
                          <p className="font-medium">{planSet.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {planSet.project_name && (
                              <span>{planSet.project_name}</span>
                            )}
                            <span>
                              {t('deletedAt')}: {new Date(planSet.deleted_at).toLocaleDateString('cs-CZ')}
                            </span>
                            {days > 0 ? (
                              <Badge variant="secondary">
                                {t('daysRemaining', { days })}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                {t('expired')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore('planSet', planSet.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            {t('restore')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete('planSet', planSet.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            {t('permanentDelete')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {planSets.length === 0 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">{t('noItems')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
