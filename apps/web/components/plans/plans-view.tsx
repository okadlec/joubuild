'use client';

import { useState, useCallback } from 'react';
import { Plus, Upload, FileText, ChevronRight, GitCompare, History, Trash2, MoreVertical, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PdfViewer } from './pdf-viewer';
import { VersionCompare } from './version-compare';
import { useOfflinePdf } from '@/lib/hooks/use-offline-pdf';

interface SheetVersion {
  id: string;
  version_number: number;
  file_url: string;
  thumbnail_url: string | null;
  is_current: boolean;
  created_at: string;
}

interface Sheet {
  id: string;
  name: string;
  sheet_number: string | null;
  sheet_versions: SheetVersion[];
}

interface PlanSet {
  id: string;
  name: string;
  sheets: Sheet[];
}

function OfflineDownloadButton({ sheetId, name, fileUrl }: { sheetId: string; name: string; fileUrl: string }) {
  const { isOffline, downloading, download, remove } = useOfflinePdf(sheetId, name, fileUrl);

  return (
    <button
      className="rounded p-1 transition-opacity hover:bg-accent"
      onClick={async (e) => {
        e.stopPropagation();
        if (isOffline) {
          await remove();
          toast.success('Offline kopie odstraněna');
        } else {
          try {
            await download();
            toast.success('Staženo pro offline');
          } catch {
            toast.error('Chyba při stahování');
          }
        }
      }}
      title={isOffline ? 'Dostupné offline' : 'Stáhnout pro offline'}
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isOffline ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Download className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

interface PlansViewProps {
  projectId: string;
  initialPlanSets: PlanSet[];
}

export function PlansView({ projectId, initialPlanSets }: PlansViewProps) {
  const [planSets, setPlanSets] = useState(initialPlanSets);
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewSet, setShowNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Version management
  const [showVersions, setShowVersions] = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    old: SheetVersion;
    new: SheetVersion;
  } | null>(null);

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('plan_sets')
      .insert({ project_id: projectId, name: newSetName })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setPlanSets([...planSets, { ...data, sheets: [] }]);
    setShowNewSet(false);
    setNewSetName('');
    toast.success('Sada výkresů vytvořena');
  };

  const handleDeleteSet = useCallback(async (planSetId: string) => {
    if (!confirm('Smazat celou sadu včetně všech výkresů?')) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('plan_sets').delete().eq('id', planSetId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPlanSets(prev => prev.filter(ps => ps.id !== planSetId));
    toast.success('Sada smazána');
  }, []);

  const handleDeleteSheet = useCallback(async (sheetId: string, planSetId: string) => {
    if (!confirm('Smazat tento výkres?')) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('sheets').delete().eq('id', sheetId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPlanSets(prev => prev.map(ps => {
      if (ps.id === planSetId) {
        return { ...ps, sheets: ps.sheets.filter(s => s.id !== sheetId) };
      }
      return ps;
    }));
    toast.success('Výkres smazán');
  }, []);

  const handleUploadPdf = useCallback(async (file: File, planSetId: string) => {
    setUploading(true);
    const supabase = getSupabaseClient();

    const fileName = `${projectId}/${planSetId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('plans')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Chyba při nahrávání: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('plans').getPublicUrl(fileName);

    const sheetName = file.name.replace(/\.pdf$/i, '');
    const { data: sheet, error: sheetError } = await supabase
      .from('sheets')
      .insert({
        plan_set_id: planSetId,
        project_id: projectId,
        name: sheetName,
      })
      .select()
      .single();

    if (sheetError || !sheet) {
      toast.error('Chyba při vytváření listu');
      setUploading(false);
      return;
    }

    const { data: version, error: versionError } = await supabase
      .from('sheet_versions')
      .insert({
        sheet_id: sheet.id,
        file_url: urlData.publicUrl,
        version_number: 1,
        is_current: true,
      })
      .select()
      .single();

    if (versionError) {
      toast.error('Chyba při vytváření verze');
      setUploading(false);
      return;
    }

    await supabase
      .from('sheets')
      .update({ current_version_id: version.id })
      .eq('id', sheet.id);

    setPlanSets(prev => prev.map(ps => {
      if (ps.id === planSetId) {
        return {
          ...ps,
          sheets: [...ps.sheets, { ...sheet, sheet_versions: [version] }],
        };
      }
      return ps;
    }));

    setUploading(false);
    setShowUpload(false);
    toast.success('Výkres nahrán');
  }, [projectId]);

  // Upload new revision of existing sheet
  const handleUploadNewVersion = useCallback(async (file: File) => {
    if (!selectedSheet) return;
    setUploading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const fileName = `${projectId}/versions/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('plans')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Chyba při nahrávání');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('plans').getPublicUrl(fileName);
    const newVersionNumber = Math.max(...selectedSheet.sheet_versions.map(v => v.version_number)) + 1;

    // Mark all existing versions as not current
    await supabase
      .from('sheet_versions')
      .update({ is_current: false })
      .eq('sheet_id', selectedSheet.id);

    // Create new version
    const { data: version, error: versionError } = await supabase
      .from('sheet_versions')
      .insert({
        sheet_id: selectedSheet.id,
        file_url: urlData.publicUrl,
        version_number: newVersionNumber,
        is_current: true,
        uploaded_by: user?.id,
      })
      .select()
      .single();

    if (versionError || !version) {
      toast.error('Chyba při vytváření verze');
      setUploading(false);
      return;
    }

    // Update sheet current_version_id
    await supabase
      .from('sheets')
      .update({ current_version_id: version.id })
      .eq('id', selectedSheet.id);

    // Update local state
    const updatedSheet = {
      ...selectedSheet,
      sheet_versions: [...selectedSheet.sheet_versions.map(v => ({ ...v, is_current: false })), version],
    };
    setSelectedSheet(updatedSheet);

    setPlanSets(prev => prev.map(ps => ({
      ...ps,
      sheets: ps.sheets.map(s => s.id === selectedSheet.id ? updatedSheet : s),
    })));

    setShowNewVersion(false);
    setUploading(false);
    toast.success(`Verze ${newVersionNumber} nahrána`);
  }, [selectedSheet, projectId]);

  // Version comparison view
  if (compareVersions) {
    return (
      <div className="h-full">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCompareVersions(null)}>
            ← Zpět
          </Button>
          <h2 className="text-lg font-semibold">
            Porovnání verzí - {selectedSheet?.name}
          </h2>
        </div>
        <VersionCompare
          oldFileUrl={compareVersions.old.file_url}
          newFileUrl={compareVersions.new.file_url}
          oldLabel={`v${compareVersions.old.version_number}`}
          newLabel={`v${compareVersions.new.version_number}`}
        />
      </div>
    );
  }

  // Sheet detail view with PDF viewer
  if (selectedSheet) {
    const currentVersion = selectedSheet.sheet_versions.find(v => v.is_current)
      || selectedSheet.sheet_versions[0];
    const versionsSorted = [...selectedSheet.sheet_versions].sort((a, b) => b.version_number - a.version_number);

    return (
      <div className="h-full">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedSheet(null); setShowVersions(false); }}>
            ← Zpět
          </Button>
          <h2 className="text-lg font-semibold">{selectedSheet.name}</h2>
          <Badge variant="outline">v{currentVersion?.version_number ?? 1}</Badge>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
            <History className="mr-1 h-3.5 w-3.5" />
            Verze ({selectedSheet.sheet_versions.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewVersion(true)}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            Nová revize
          </Button>
          {currentVersion && (
            <OfflineDownloadButton
              sheetId={selectedSheet.id}
              name={selectedSheet.name}
              fileUrl={currentVersion.file_url}
            />
          )}
        </div>

        {/* Versions panel */}
        {showVersions && (
          <div className="mb-4 rounded-lg border bg-background p-4">
            <h3 className="mb-3 text-sm font-semibold">Historie verzí</h3>
            <div className="space-y-2">
              {versionsSorted.map((v, index) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={v.is_current ? 'default' : 'outline'}>
                      v{v.version_number}
                    </Badge>
                    {v.is_current && <span className="text-xs text-green-600">aktuální</span>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {index < versionsSorted.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCompareVersions({
                          old: versionsSorted[index + 1],
                          new: v,
                        })}
                      >
                        <GitCompare className="mr-1 h-3.5 w-3.5" />
                        Porovnat
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentVersion && (
          <div className="relative">
            {!currentVersion.is_current && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <div className="rotate-[-30deg] rounded-lg border-4 border-red-500/30 px-8 py-4 text-4xl font-bold text-red-500/30">
                  NEAKTUÁLNÍ
                </div>
              </div>
            )}
            <PdfViewer
              fileUrl={currentVersion.file_url}
              sheetVersionId={currentVersion.id}
              sheetId={selectedSheet.id}
              projectId={projectId}
              isCurrent={currentVersion.is_current}
            />
          </div>
        )}

        {/* New Version Upload Dialog */}
        <Dialog open={showNewVersion} onClose={() => setShowNewVersion(false)}>
          <DialogHeader>
            <DialogTitle>Nová revize výkresu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nahrajte novou verzi výkresu &quot;{selectedSheet.name}&quot;.
              Stávající verze bude zachována v historii.
            </p>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="new-version-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadNewVersion(file);
              }}
            />
            <Button
              className="w-full"
              onClick={() => document.getElementById('new-version-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Nahrávání...' : 'Vybrat PDF soubor'}
            </Button>
          </div>
        </Dialog>
      </div>
    );
  }

  // Plan sets list view
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Výkresy</h1>
          <p className="text-sm text-muted-foreground">Správa stavebních výkresů a plánů</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewSet(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nová sada
          </Button>
          <Button onClick={() => setShowUpload(true)} disabled={planSets.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            Nahrát PDF
          </Button>
        </div>
      </div>

      {planSets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Žádné výkresy</p>
          <p className="mb-4 text-sm text-muted-foreground">Vytvořte sadu a nahrajte PDF výkresy</p>
          <Button onClick={() => setShowNewSet(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nová sada
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {planSets.map((planSet) => (
            <div key={planSet.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{planSet.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteSet(planSet.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {planSet.sheets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné listy v této sadě</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {planSet.sheets.map((sheet) => {
                    const currentVersion = sheet.sheet_versions.find(v => v.is_current) || sheet.sheet_versions[0];
                    return (
                      <Card
                        key={sheet.id}
                        className="group relative cursor-pointer transition-shadow hover:shadow-md"
                        onClick={() => setSelectedSheet(sheet)}
                      >
                        <button
                          className="absolute right-1 top-1 z-10 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSheet(sheet.id, planSet.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex h-28 items-center justify-center rounded-t-lg bg-muted">
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{sheet.name}</p>
                            <div className="flex items-center gap-1">
                              {currentVersion && (
                                <OfflineDownloadButton
                                  sheetId={sheet.id}
                                  name={sheet.name}
                                  fileUrl={currentVersion.file_url}
                                />
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {sheet.sheet_number && (
                              <span className="text-xs text-muted-foreground">#{sheet.sheet_number}</span>
                            )}
                            {currentVersion && sheet.sheet_versions.length > 1 && (
                              <Badge variant="outline" className="text-[10px]">
                                v{currentVersion.version_number}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Set Dialog */}
      <Dialog open={showNewSet} onClose={() => setShowNewSet(false)}>
        <DialogHeader>
          <DialogTitle>Nová sada výkresů</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateSet} className="space-y-4">
          <div className="space-y-2">
            <Label>Název sady</Label>
            <Input
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="Architektura, Elektro, ZTI..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowNewSet(false)}>Zrušit</Button>
            <Button type="submit">Vytvořit</Button>
          </div>
        </form>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onClose={() => setShowUpload(false)}>
        <DialogHeader>
          <DialogTitle>Nahrát výkres</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vyberte sadu</Label>
            {planSets.map((ps) => (
              <label key={ps.id} className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  id={`upload-${ps.id}`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPdf(file, ps.id);
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.getElementById(`upload-${ps.id}`)?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {ps.name}
                </Button>
              </label>
            ))}
          </div>
          {uploading && <p className="text-sm text-muted-foreground">Nahrávání...</p>}
        </div>
      </Dialog>
    </div>
  );
}
