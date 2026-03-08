import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';

interface FolderBrowserProps {
  documents: any[];
  currentPath: string;
  allFolderPaths: string[];
  onNavigateFolder: (path: string) => void;
  onFilePress: (doc: any) => void;
  onFileLongPress: (doc: any) => void;
}

function getSubfolders(allPaths: string[], currentPath: string): string[] {
  const prefix = currentPath === '/' ? '/' : currentPath;
  const subfolders = new Set<string>();

  for (const p of allPaths) {
    if (p === currentPath) continue;
    if (!p.startsWith(prefix)) continue;

    const rest = p.slice(prefix.length);
    const nextSlash = rest.indexOf('/', rest.startsWith('/') ? 1 : 0);
    const folderName =
      nextSlash === -1 ? rest : rest.slice(0, nextSlash + 1);

    if (folderName && folderName !== '/') {
      const cleanName = folderName.replace(/^\/|\/$/g, '');
      if (cleanName) subfolders.add(cleanName);
    }
  }

  return [...subfolders].sort();
}

function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return 'document-outline';
  if (mimeType === 'application/pdf') return 'document-text-outline';
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  )
    return 'grid-outline';
  if (mimeType.includes('word') || mimeType.includes('document'))
    return 'create-outline';
  return 'document-outline';
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FolderBrowser({
  documents,
  currentPath,
  allFolderPaths,
  onNavigateFolder,
  onFilePress,
  onFileLongPress,
}: FolderBrowserProps) {
  const { t } = useTranslation();

  const filesAtPath = documents.filter((d) => d.folder_path === currentPath);
  const subfolders = getSubfolders(allFolderPaths, currentPath);

  // Build breadcrumb segments
  const breadcrumbs: { label: string; path: string }[] = [
    { label: t('documents.root'), path: '/' },
  ];
  if (currentPath !== '/') {
    const parts = currentPath.replace(/^\/|\/$/g, '').split('/');
    let accumulated = '/';
    for (const part of parts) {
      accumulated += `${part}/`;
      breadcrumbs.push({ label: part, path: accumulated });
    }
  }

  const isEmpty = subfolders.length === 0 && filesAtPath.length === 0;

  return (
    <View className="flex-1">
      {/* Breadcrumbs */}
      <View className="flex-row items-center px-4 py-3 bg-neutral-900 border-b border-neutral-800">
        {breadcrumbs.map((crumb, i) => (
          <View key={crumb.path} className="flex-row items-center">
            {i > 0 && (
              <Ionicons
                name="chevron-forward"
                size={14}
                color="#737373"
                style={{ marginHorizontal: 4 }}
              />
            )}
            <TouchableOpacity onPress={() => onNavigateFolder(crumb.path)}>
              <Text
                className={
                  i === breadcrumbs.length - 1
                    ? 'text-white font-medium'
                    : 'text-neutral-400'
                }
              >
                {crumb.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {isEmpty ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="folder-open-outline" size={48} color="#525252" />
          <Text className="text-neutral-500 mt-3">
            {currentPath === '/'
              ? t('documents.noDocuments')
              : t('documents.noFilesInFolder')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...subfolders.map((name) => ({ type: 'folder' as const, name })),
            ...filesAtPath.map((doc: any) => ({ type: 'file' as const, ...doc })),
          ]}
          keyExtractor={(item) =>
            item.type === 'folder' ? `folder-${item.name}` : item.id
          }
          renderItem={({ item }) => {
            if (item.type === 'folder') {
              const folderPath =
                currentPath === '/'
                  ? `/${item.name}/`
                  : `${currentPath}${item.name}/`;
              return (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 border-b border-neutral-800"
                  onPress={() => onNavigateFolder(folderPath)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-lg bg-amber-500/20 items-center justify-center mr-3">
                    <Ionicons name="folder" size={22} color="#F59E0B" />
                  </View>
                  <Text className="text-white flex-1 font-medium">
                    {item.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#737373" />
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-b border-neutral-800"
                onPress={() => onFilePress(item)}
                onLongPress={() => onFileLongPress(item)}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-lg bg-blue-500/20 items-center justify-center mr-3">
                  <Ionicons
                    name={getFileIcon(item.mime_type) as any}
                    size={22}
                    color="#3B82F6"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-neutral-500 text-xs mt-0.5">
                    {formatSize(item.file_size)}
                    {item.file_size && item.created_at ? ' · ' : ''}
                    {item.created_at ? formatDate(item.created_at) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
