import { FlatList, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from '@/lib/format';

interface AnnotationListProps {
  annotations: any[];
  onSelect: (annotationId: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; labelKey: string }> = {
  pin: { icon: 'location', color: '#3B82F6', labelKey: 'plans.annotationPin' },
  line: { icon: 'remove-outline', color: '#8B5CF6', labelKey: 'plans.annotationLine' },
  arrow: { icon: 'arrow-forward-outline', color: '#8B5CF6', labelKey: 'plans.annotationArrow' },
  rectangle: { icon: 'square-outline', color: '#F59E0B', labelKey: 'plans.annotationRectangle' },
  area: { icon: 'scan-outline', color: '#F59E0B', labelKey: 'plans.annotationArea' },
  ellipse: { icon: 'ellipse-outline', color: '#EC4899', labelKey: 'plans.annotationEllipse' },
  freehand: { icon: 'pencil-outline', color: '#10B981', labelKey: 'plans.annotationFreehand' },
  highlighter: { icon: 'color-fill-outline', color: '#FBBF24', labelKey: 'plans.annotationHighlighter' },
};

const DEFAULT_CONFIG = { icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap, color: '#6B7280', labelKey: 'plans.annotationUnknown' };

export function AnnotationList({ annotations, onSelect }: AnnotationListProps) {
  const { t } = useTranslation();

  if (annotations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Ionicons name="layers-outline" size={48} color="#525252" />
        <Text className="text-neutral-500 mt-3 text-base">{t('plans.noAnnotations')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={annotations}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item }) => {
        const config = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG;
        const data = item.data as Record<string, any> | undefined;
        const pinIcon = item.type === 'pin' && data?.icon === 'task' ? 'checkbox-outline' : config.icon;
        const subtitle = data?.color
          ? `${t(config.labelKey)}`
          : t(config.labelKey);

        return (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-b border-neutral-800"
            activeOpacity={0.7}
            onPress={() => onSelect(item.id)}
          >
            <View
              style={{ backgroundColor: config.color }}
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
            >
              <Ionicons name={pinIcon} size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base">{subtitle}</Text>
              {item.created_at && (
                <Text className="text-neutral-500 text-sm mt-0.5">
                  {formatDistanceToNow(item.created_at)}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#525252" />
          </TouchableOpacity>
        );
      }}
    />
  );
}
