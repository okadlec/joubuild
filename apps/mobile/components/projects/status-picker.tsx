import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PROJECT_STATUSES } from '@joubuild/shared';

const STATUS_COLORS: Record<string, { bg: string; activeBg: string; text: string }> = {
  active: { bg: 'bg-neutral-800', activeBg: 'bg-green-500/30', text: 'text-green-400' },
  archived: { bg: 'bg-neutral-800', activeBg: 'bg-yellow-500/30', text: 'text-yellow-400' },
  completed: { bg: 'bg-neutral-800', activeBg: 'bg-neutral-500/30', text: 'text-neutral-300' },
};

interface StatusPickerProps {
  value: string;
  onChange: (status: string) => void;
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row gap-2">
      {PROJECT_STATUSES.map((status) => {
        const isActive = value === status;
        const colors = STATUS_COLORS[status] ?? STATUS_COLORS.active;
        return (
          <TouchableOpacity
            key={status}
            className={`px-3 py-1.5 rounded-full ${isActive ? colors.activeBg : colors.bg}`}
            onPress={() => onChange(status)}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${isActive ? colors.text : 'text-neutral-500'}`}
            >
              {t(`projects.status.${status}`, { defaultValue: status })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
