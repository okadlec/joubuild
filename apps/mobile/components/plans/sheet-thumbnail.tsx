import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface SheetThumbnailProps {
  sheet: {
    id: string;
    name: string;
    sheet_number: string | null;
    sheet_versions: Array<{
      id: string;
      version_number: number;
      thumbnail_url: string | null;
      is_current: boolean;
    }>;
  };
  onPress: (sheetId: string) => void;
}

export function SheetThumbnail({ sheet, onPress }: SheetThumbnailProps) {
  const { t } = useTranslation();
  const currentVersion = sheet.sheet_versions?.find((v) => v.is_current);
  const versionNumber = currentVersion?.version_number ?? 1;
  const thumbnailUrl = currentVersion?.thumbnail_url;

  return (
    <TouchableOpacity
      className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex-1 m-1"
      onPress={() => onPress(sheet.id)}
      activeOpacity={0.7}
    >
      <View className="aspect-[4/3] bg-neutral-800 items-center justify-center">
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="document-outline" size={40} color="#525252" />
        )}
      </View>
      <View className="p-3">
        <Text className="text-white text-sm font-medium" numberOfLines={1}>
          {sheet.name}
        </Text>
        <View className="flex-row items-center mt-1">
          {sheet.sheet_number && (
            <Text className="text-neutral-500 text-xs mr-2">
              #{sheet.sheet_number}
            </Text>
          )}
          <View className="bg-blue-500/20 rounded px-1.5 py-0.5">
            <Text className="text-blue-400 text-xs">
              {t('plans.version', { number: versionNumber })}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
