import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../providers/auth-provider';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 bg-neutral-950 px-6 pt-8">
      <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
        <Text className="text-neutral-400 text-sm mb-1">Email</Text>
        <Text className="text-white text-base">{user?.email}</Text>
      </View>

      <TouchableOpacity
        className="bg-red-500/10 border border-red-500/30 rounded-xl py-3 items-center"
        onPress={signOut}
      >
        <Text className="text-red-400 font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
