'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@joubuild/shared';
import { toast } from 'sonner';
import { createOrganizationAndProject } from './actions';

interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function ProjectsList({ initialProjects }: { initialProjects: Project[] }) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [projects, setProjects] = useState(initialProjects);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await createOrganizationAndProject({
      name,
      description: description || null,
      address: address || null,
    });

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    setProjects([result.data!, ...projects]);
    setShowCreate(false);
    setName('');
    setDescription('');
    setAddress('');
    setLoading(false);
    toast.success(t('projectCreated'));
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    active: 'default',
    archived: 'secondary',
    completed: 'outline',
  };

  return (
    <>
      <div className="mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newProject')}
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="mb-2 text-lg font-medium">{t('noProjects')}</p>
          <p className="mb-4 text-sm text-muted-foreground">{t('noProjectsDescription')}</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newProject')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/project/${project.id}/plans`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <div className="h-32 rounded-t-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  {project.cover_image_url && (
                    <img
                      src={project.cover_image_url}
                      alt={project.name}
                      className="h-full w-full rounded-t-lg object-cover"
                    />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold">{project.name}</h3>
                    <Badge variant={statusVariant[project.status] || 'default'}>
                      {t(`statuses.${project.status}`)}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>{t('newProject')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">{tCommon('name')} *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-desc">{tCommon('description')}</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-addr">Adresa</Label>
            <Input
              id="project-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tCommon('loading') : tCommon('create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
