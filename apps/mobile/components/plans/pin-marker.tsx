import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinMarkerProps {
  type: 'photo' | 'task';
  statusColor?: string;
  x: number;
  y: number;
  selected?: boolean;
  onPress?: () => void;
}

export function PinMarker({ type, statusColor, x, y, selected, onPress }: PinMarkerProps) {
  const color = type === 'photo' ? '#3B82F6' : statusColor ?? '#F59E0B';
  const icon = type === 'photo' ? 'camera' : 'checkbox-outline';

  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        left: x - 14,
        top: y - 28,
      }}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {selected && (
        <View
          style={{
            position: 'absolute',
            left: -6,
            top: -6,
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#38BDF8',
            borderStyle: 'dashed',
          }}
        />
      )}
      <View
        style={{ backgroundColor: color }}
        className="w-7 h-7 rounded-full items-center justify-center"
      >
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          alignSelf: 'center',
          marginTop: -1,
        }}
      />
    </TouchableOpacity>
  );
}
