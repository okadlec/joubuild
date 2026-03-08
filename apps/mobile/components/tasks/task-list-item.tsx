import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '@joubuild/shared';
import type { Task, TaskCategory } from '@joubuild/shared';
import { formatDate } from '@/lib/format';
import { useTranslation } from 'react-i18next';

interface TaskListItemProps {
  task: Task;
  category?: TaskCategory | null;
  assigneeName?: string | null;
  onPress: () => void;
}

export function TaskListItem({ task, category, assigneeName, onPress }: TaskListItemProps) {
  const { t } = useTranslation();
  const statusColor = TASK_STATUS_COLORS[task.status] ?? '#6B7280';
  const priorityColor = TASK_PRIORITY_COLORS[task.priority] ?? '#6B7280';

  const statusLabel = t(`tasks.status.${task.status}`);

  return (
    <TouchableOpacity
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        {/* Priority dot */}
        <View
          className="w-3 h-3 rounded-full mt-1 mr-3"
          style={{ backgroundColor: priorityColor }}
        />
        <View className="flex-1">
          <Text className="text-white font-medium text-base" numberOfLines={2}>
            {task.title}
          </Text>

          <View className="flex-row items-center mt-2 flex-wrap">
            {/* Status badge */}
            <View
              className="rounded-md px-2 py-0.5 mr-2 mb-1"
              style={{ backgroundColor: statusColor + '20' }}
            >
              <Text style={{ color: statusColor }} className="text-xs font-medium">
                {statusLabel}
              </Text>
            </View>

            {/* Category badge */}
            {category && (
              <View
                className="rounded-md px-2 py-0.5 mr-2 mb-1"
                style={{ backgroundColor: category.color + '20' }}
              >
                <Text style={{ color: category.color }} className="text-xs font-medium">
                  {category.name}
                </Text>
              </View>
            )}

            {/* Due date */}
            {task.due_date && (
              <View className="flex-row items-center mr-2 mb-1">
                <Ionicons name="calendar-outline" size={12} color="#737373" />
                <Text className="text-neutral-400 text-xs ml-1">
                  {formatDate(task.due_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="items-center ml-2">
          {assigneeName ? (
            <View className="w-7 h-7 rounded-full bg-blue-500/20 items-center justify-center mb-1">
              <Text className="text-blue-400 text-xs font-semibold">
                {assigneeName
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color="#525252" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
