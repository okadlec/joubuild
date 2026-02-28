'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate, slugify } from '@joubuild/shared';
import { PROJECT_STATUS_LABELS } from '@joubuild/shared';
import { toast } from 'sonner';

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
  const [projects, setProjects] = useState(initialProjects);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = getSupabaseClient();

    // Get or create organization
    let orgId: string;
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: 'Moje firma', slug: slugify('Moje firma') })
        .select()
        .single();
      if (orgError || !newOrg) {
        toast.error('Chyba při vytváření organizace');
        setLoading(false);
        return;
      }
      orgId = newOrg.id;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        organization_id: orgId,
        name,
        description: description || null,
        address: address || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setProjects([data, ...projects]);
    setShowCreate(false);
    setName('');
    setDescription('');
    setAddress('');
    setLoading(false);
    toast.success('Projekt vytvořen');
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
          Nový projekt
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="mb-2 text-lg font-medium">Žádné projekty</p>
          <p className="mb-4 text-sm text-muted-foreground">Vytvořte svůj první stavební projekt</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nový projekt
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/project/${project.id}/tasks`}>
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
                      {PROJECT_STATUS_LABELS[project.status] || project.status}
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
          <DialogTitle>Nový projekt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Název projektu *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bytový dům Vinohrady"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-desc">Popis</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popis projektu..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-addr">Adresa</Label>
            <Input
              id="project-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Vinohradská 123, Praha"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Vytváření...' : 'Vytvořit'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
