'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Home,
  Tag,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatFileSize } from '@joubuild/shared';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useFolderPermissions } from '@/lib/hooks/use-folder-permissions';
import { TagPicker } from '@/components/shared/tag-picker';
import { SimplePdfViewer } from '@/components/shared/simple-pdf-viewer';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  folder_id: string | null;
  tags: string[] | null;
  created_at: string;
}

interface Folder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

export function FilesView({
  projectId,
  initialDocuments,
  initialFolders,
}: {
  projectId: string;
  initialDocuments: Document[];
  initialFolders: Folder[];
}) {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');
  const [documents, setDocuments] = useState(initialDocuments);
  const [folders, setFolders] = useState(initialFolders);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [editingTagsDocId, setEditingTagsDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  const { hasPermission } = usePermissions(projectId);
  const canEdit = hasPermission('files', 'can_edit');
  const { canViewFolder, canCreateInFolder, canDeleteInFolder } = useFolderPermissions(projectId);

  const canCreate = hasPermission('files', 'can_create');
  const canDelete = hasPermission('files', 'can_delete');

  // Build breadcrumb path from current folder up to root
  const breadcrumbs = useMemo(() => {
    const path: Folder[] = [];
    let id = currentFolderId;
    while (id) {
      const folder = folders.find(f => f.id === id);
      if (!folder) break;
      path.unshift(folder);
      id = folder.parent_id;
    }
    return path;
  }, [currentFolderId, folders]);

  // Filter folders and documents for current view
  const visibleFolders = folders
    .filter(f => f.parent_id === currentFolderId)
    .filter(f => canViewFolder(f.id));

  const visibleDocuments = documents.filter(d =>
    currentFolderId ? d.folder_id === currentFolderId : !d.folder_id
  );

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (!canCreate) return;
      if (currentFolderId && !canCreateInFolder(currentFolderId)) {
        toast.error('Nemáte oprávnění nahrávat do této složky');
        return;
      }

      setUploading(true);
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const fileName = `${projectId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Chyba: ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        const { data, error } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            folder_id: currentFolderId,
            uploaded_by: user?.id,
          })
          .select()
          .single();

        if (!error && data) {
          setDocuments(prev => [data, ...prev]);
        }
      }

      setUploading(false);
      toast.success(t('fileUploaded'));
    },
    [projectId, currentFolderId, canCreate, canCreateInFolder]
  );

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;

    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('folders')
      .insert({
        project_id: projectId,
        parent_id: currentFolderId,
        name: newFolderName.trim(),
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      setFolders(prev => [...prev, data]);
    }

    setNewFolderName('');
    setShowNewFolder(false);
    toast.success('Složka vytvořena');
  }

  async function handleDeleteDocument(id: string) {
    if (!confirm('Opravdu chcete smazat tento soubor?')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success('Soubor smazán');
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('Opravdu chcete smazat tuto složku? Podsložky budou také smazány, soubory budou přesunuty do kořene.')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Remove folder and its children from state
    const idsToRemove = new Set<string>();
    function collectChildren(parentId: string) {
      idsToRemove.add(parentId);
      folders.filter(f => f.parent_id === parentId).forEach(f => collectChildren(f.id));
    }
    collectChildren(id);
    setFolders(prev => prev.filter(f => !idsToRemove.has(f.id)));
    // Documents with deleted folder_id get SET NULL by DB — update local state
    setDocuments(prev =>
      prev.map(d => (idsToRemove.has(d.folder_id || '') ? { ...d, folder_id: null } : d))
    );
    toast.success('Složka smazána');
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  // All unique tags across all documents
  const allDocTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach(d => d.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [documents]);

  async function handleUpdateDocTags(docId: string, newTags: string[]) {
    const supabase = getSupabaseClient();
    const tagsValue = newTags.length > 0 ? newTags : null;
    const { error } = await supabase
      .from('documents')
      .update({ tags: tagsValue })
      .eq('id', docId);

    if (error) {
      toast.error(error.message);
      return;
    }
    setDocuments(prev =>
      prev.map(d => (d.id === docId ? { ...d, tags: tagsValue } : d))
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {visibleDocuments.length} souborů, {visibleFolders.length} složek
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              {t('newFolder')}
            </Button>
            <input
              type="file"
              multiple
              className="hidden"
              id="file-upload"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? tCommon('loading') : tCommon('upload')}
            </Button>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentFolderId(null)}
          className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Kořen
        </button>
        {breadcrumbs.map(folder => (
          <div key={folder.id} className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => setCurrentFolderId(folder.id)}
              className="rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Drop zone indicator */}
      {dragOver && (
        <div className="mb-4 rounded-lg border-2 border-dashed border-primary bg-primary/5 p-8 text-center text-primary">
          Přetáhněte soubory sem pro nahrání
        </div>
      )}

      {visibleFolders.length === 0 && visibleDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Prázdná složka</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Nahrajte soubory nebo vytvořte podsložku
          </p>
          {canCreate && (
            <Button onClick={() => document.getElementById('file-upload')?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Nahrát
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Folders first */}
          {visibleFolders.map(folder => (
            <Card key={folder.id}>
              <CardContent className="flex items-center justify-between p-4">
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <FolderOpen className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-medium">{folder.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(folder.created_at)}
                    </p>
                  </div>
                </button>
                {canDelete && canDeleteInFolder(folder.id) && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteFolder(folder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Documents */}
          {visibleDocuments.map(doc => {
            const isPdf = doc.mime_type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
            return (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      {isPdf ? (
                        <button
                          className="font-medium text-left hover:underline"
                          onClick={() => setViewingDoc(doc)}
                        >
                          {doc.name}
                        </button>
                      ) : (
                        <p className="font-medium">{doc.name}</p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.tags && doc.tags.length > 0 && editingTagsDocId !== doc.id && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map(t => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTagsDocId(editingTagsDocId === doc.id ? null : doc.id)}
                        title="Tagy"
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                    )}
                    {isPdf && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewingDoc(doc)}
                        title="Zobrazit PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {editingTagsDocId === doc.id && (
                  <div className="mt-3 border-t pt-3">
                    <TagPicker
                      tags={doc.tags || []}
                      onChange={(newTags) => handleUpdateDocTags(doc.id, newTags)}
                      suggestions={allDocTags}
                      placeholder="Přidat tag..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* PDF Viewer */}
      {viewingDoc && (
        <SimplePdfViewer
          fileUrl={viewingDoc.file_url}
          fileName={viewingDoc.name}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* New folder dialog */}
      <Dialog open={showNewFolder} onClose={() => setShowNewFolder(false)}>
        <DialogHeader>
          <DialogTitle>{t('newFolder')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Název složky"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>
              Zrušit
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Vytvořit
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
