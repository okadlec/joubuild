import { useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useDocuments } from '@/hooks/use-documents';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useFileDownload } from '@/hooks/use-file-download';
import { FolderBrowser } from '@/components/documents/folder-browser';
import { UploadProgress } from '@/components/documents/upload-progress';
import { NewFolderModal } from '@/components/documents/new-folder-modal';
import { supabase } from '@/lib/supabase';
import { deleteDocument } from '@joubuild/supabase';

export default function DocumentsScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { documents, folders, loading, refreshing, onRefresh } = useDocuments(projectId!);
  const { pickAndUpload, uploading } = useFileUpload(projectId!);
  const { download, downloading } = useFileDownload();
  const [currentPath, setCurrentPath] = useState('/');
  const [folderModalVisible, setFolderModalVisible] = useState(false);

  const allFolderPaths = folders;

  const handleFilePress = async (doc: any) => {
    const isPdf = doc.mime_type === 'application/pdf';

    if (isPdf) {
      router.push({
        pathname: `/(app)/project/${projectId}/documents/viewer` as any,
        params: { fileUrl: doc.file_url, name: doc.name },
      });
      return;
    }

    // Non-PDF: download and share
    const ext = doc.name.split('.').pop() ?? 'bin';
    await download(doc.file_url, doc.id, ext);
  };

  const handleFileLongPress = (doc: any) => {
    Alert.alert(t('documents.deleteFile'), t('documents.deleteFileConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('documents.deleteFile'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteDocument(supabase, doc.id);
          if (!error) onRefresh();
        },
      },
    ]);
  };

  const handleUpload = async () => {
    const success = await pickAndUpload(currentPath);
    if (success) onRefresh();
  };

  const handleCreateFolder = (name: string) => {
    const newPath =
      currentPath === '/' ? `/${name}/` : `${currentPath}${name}/`;
    setCurrentPath(newPath);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-950">
      <FolderBrowser
        documents={documents}
        currentPath={currentPath}
        allFolderPaths={allFolderPaths}
        onNavigateFolder={setCurrentPath}
        onFilePress={handleFilePress}
        onFileLongPress={handleFileLongPress}
      />

      {/* FAB - Upload */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={handleUpload}
        disabled={uploading}
        activeOpacity={0.7}
      >
        <Ionicons name="cloud-upload-outline" size={26} color="#fff" />
      </TouchableOpacity>

      {/* FAB - New Folder */}
      <TouchableOpacity
        className="absolute bottom-6 right-24 bg-amber-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setFolderModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="folder-open-outline" size={26} color="#fff" />
      </TouchableOpacity>

      <UploadProgress visible={uploading} />
      <NewFolderModal
        visible={folderModalVisible}
        onClose={() => setFolderModalVisible(false)}
        onCreateFolder={handleCreateFolder}
      />
    </View>
  );
}
