import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert, TouchableOpacity, Text, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getSheet, updateAnnotation, deleteAnnotation } from '@joubuild/supabase';
import { useOfflinePdf } from '@/hooks/use-offline-pdf';
import { useAnnotations } from '@/hooks/use-annotations';
import { useAnnotationSelection } from '@/hooks/use-annotation-selection';
import { ZoomablePlanViewer } from '@/components/plans/zoomable-plan-viewer';
import { DownloadProgress } from '@/components/plans/download-progress';
import { AnnotationList } from '@/components/plans/annotation-list';
import { AnnotationActionToolbar } from '@/components/plans/annotation-action-toolbar';

export default function SheetViewerScreen() {
  const { id, sheetId } = useLocalSearchParams<{
    id: string;
    sheetId: string;
  }>();
  const { t } = useTranslation();
  const router = useRouter();

  const [sheet, setSheet] = useState<any>(null);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const currentVersion = sheet?.sheet_versions?.find((v: any) => v.is_current);
  const fileUrl = currentVersion?.file_url ?? '';
  const versionNumber = currentVersion?.version_number ?? 1;

  const { localUri, downloading, progress, error, download } = useOfflinePdf(
    fileUrl,
    sheetId!,
    versionNumber
  );

  const { annotations, refetch } = useAnnotations(currentVersion?.id ?? null);
  const { selectedId, mode, select, deselect, startMove, endMove } =
    useAnnotationSelection();

  useEffect(() => {
    if (!sheetId) return;
    getSheet(supabase, sheetId).then(({ data }) => {
      setSheet(data);
      setLoadingSheet(false);
    });
  }, [sheetId]);

  useEffect(() => {
    if (fileUrl && !localUri && !downloading) {
      download();
    }
  }, [fileUrl, localUri, downloading, download]);

  useEffect(() => {
    if (error) {
      Alert.alert(t('plans.downloadError'), error);
    }
  }, [error, t]);

  const selectedAnnotation = selectedId
    ? annotations.find((a) => a.id === selectedId)
    : null;

  const handleColorChange = async (color: string) => {
    if (!selectedAnnotation) return;
    const oldData = selectedAnnotation.data as Record<string, any>;
    await updateAnnotation(supabase, selectedAnnotation.id, {
      data: { ...oldData, color },
    });
    refetch();
  };

  const handleDelete = () => {
    if (!selectedAnnotation) return;
    Alert.alert(
      t('common.delete'),
      t('plans.deleteAnnotationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteAnnotation(supabase, selectedAnnotation.id);
            deselect();
            refetch();
          },
        },
      ]
    );
  };

  const handleDetail = () => {
    if (!selectedId) return;
    deselect();
    router.push(
      `/(app)/project/${id}/plans/sheet/${sheetId}/annotation/${selectedId}` as any
    );
  };

  const handleMoveToggle = () => {
    if (mode === 'moving') {
      endMove();
    } else {
      startMove();
    }
  };

  const handleMoveEnd = async (
    annotationId: string,
    deltaXPdf: number,
    deltaYPdf: number
  ) => {
    const ann = annotations.find((a) => a.id === annotationId);
    if (!ann) return;
    const d = ann.data as Record<string, any>;
    let newData: Record<string, any>;

    switch (ann.type) {
      case 'rectangle':
      case 'area':
      case 'ellipse':
      case 'pin':
        newData = { ...d, x: (d.x ?? 0) + deltaXPdf, y: (d.y ?? 0) + deltaYPdf };
        break;
      case 'line':
      case 'arrow':
      case 'freehand':
      case 'highlighter': {
        const pts = [...((d.points as number[]) ?? [])];
        for (let i = 0; i < pts.length; i += 2) {
          pts[i] += deltaXPdf;
          pts[i + 1] += deltaYPdf;
        }
        newData = { ...d, points: pts };
        break;
      }
      default:
        return;
    }

    await updateAnnotation(supabase, annotationId, { data: newData });
    endMove();
    refetch();
  };

  if (loadingSheet) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: sheet?.name ?? '',
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-neutral-950">
        {downloading && <DownloadProgress progress={progress} />}
        {localUri && (
          <View className="flex-1">
            <ZoomablePlanViewer
              uri={localUri}
              pdfWidth={currentVersion?.width ?? 0}
              pdfHeight={currentVersion?.height ?? 0}
              annotations={annotations}
              selectedId={selectedId}
              isMoving={mode === 'moving'}
              onShapePress={select}
              onDeselect={deselect}
              onMoveEnd={handleMoveEnd}
            />
          </View>
        )}

        {selectedId && (
          <AnnotationActionToolbar
            isMoving={mode === 'moving'}
            onMove={handleMoveToggle}
            onColor={handleColorChange}
            onDetail={handleDetail}
            onDelete={handleDelete}
          />
        )}

        {/* FAB — annotation list toggle */}
        {annotations.length > 0 && !selectedId && (
          <TouchableOpacity
            className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg"
            activeOpacity={0.8}
            onPress={() => setShowAnnotations(true)}
          >
            <Ionicons name="layers-outline" size={24} color="#fff" />
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
              <Text className="text-white text-xs font-bold">
                {annotations.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Annotation list modal */}
        <Modal
          visible={showAnnotations}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAnnotations(false)}
        >
          <View className="flex-1 bg-neutral-950">
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-800">
              <Text className="text-white text-lg font-semibold">
                {t('plans.annotations')} ({annotations.length})
              </Text>
              <TouchableOpacity onPress={() => setShowAnnotations(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <AnnotationList
              annotations={annotations}
              onSelect={(annotationId) => {
                setShowAnnotations(false);
                router.push(
                  `/(app)/project/${id}/plans/sheet/${sheetId}/annotation/${annotationId}` as any
                );
              }}
            />
          </View>
        </Modal>
      </View>
    </>
  );
}
