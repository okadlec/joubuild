import { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRESET_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#FFFFFF',
  '#000000',
];

interface AnnotationActionToolbarProps {
  isMoving: boolean;
  onMove: () => void;
  onColor: (color: string) => void;
  onDetail: () => void;
  onDelete: () => void;
}

export function AnnotationActionToolbar({
  isMoving,
  onMove,
  onColor,
  onDetail,
  onDelete,
}: AnnotationActionToolbarProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <View className="absolute bottom-6 left-4 right-4 items-center" pointerEvents="box-none">
      {showColors && (
        <View className="flex-row bg-neutral-900/95 rounded-2xl px-3 py-2 mb-2 gap-2">
          {PRESET_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => {
                onColor(color);
                setShowColors(false);
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: color,
                  borderWidth: color === '#FFFFFF' ? 1 : 0,
                  borderColor: '#525252',
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View className="flex-row bg-neutral-900/95 rounded-2xl px-2 py-2 gap-1">
        <ToolbarButton
          icon="move-outline"
          label="Move"
          active={isMoving}
          onPress={onMove}
        />
        <ToolbarButton
          icon="color-palette-outline"
          label="Color"
          active={showColors}
          onPress={() => setShowColors((v) => !v)}
        />
        <ToolbarButton
          icon="information-circle-outline"
          label="Detail"
          onPress={onDetail}
        />
        <ToolbarButton
          icon="trash-outline"
          label="Delete"
          destructive
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  destructive,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const color = destructive ? '#EF4444' : active ? '#38BDF8' : '#D4D4D4';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center px-3 py-1"
    >
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={{ color, fontSize: 10, marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );
}
