import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { TASK_STATUSES, TASK_STATUS_COLORS } from '@joubuild/shared';
import { useTranslation } from 'react-i18next';

interface TaskFilterBarProps {
  selectedStatus: string | undefined;
  onStatusChange: (status: string | undefined) => void;
}

export function TaskFilterBar({ selectedStatus, onStatusChange }: TaskFilterBarProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-3"
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <View className="flex-row items-center">
        {/* All chip */}
        <TouchableOpacity
          className="rounded-full px-4 py-1.5 mr-2"
          style={{
            backgroundColor: !selectedStatus ? '#3B82F620' : '#262626',
            borderWidth: 1,
            borderColor: !selectedStatus ? '#3B82F6' : '#404040',
          }}
          onPress={() => onStatusChange(undefined)}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: !selectedStatus ? '#3B82F6' : '#a3a3a3' }}
          >
            {t('tasks.allTasks')}
          </Text>
        </TouchableOpacity>

        {TASK_STATUSES.map((s) => {
          const color = TASK_STATUS_COLORS[s] ?? '#6B7280';
          const isSelected = selectedStatus === s;
          return (
            <TouchableOpacity
              key={s}
              className="rounded-full px-4 py-1.5 mr-2"
              style={{
                backgroundColor: isSelected ? color + '20' : '#262626',
                borderWidth: 1,
                borderColor: isSelected ? color : '#404040',
              }}
              onPress={() => onStatusChange(isSelected ? undefined : s)}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: isSelected ? color : '#a3a3a3' }}
              >
                {t(`tasks.status.${s}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
