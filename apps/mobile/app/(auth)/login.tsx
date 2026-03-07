import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../providers/auth-provider';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-neutral-950"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-white mb-2">JouBuild</Text>
        <Text className="text-neutral-400 mb-8">Sign in to your account</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-neutral-300 mb-1 text-sm">Email</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white"
              placeholder="you@example.com"
              placeholderTextColor="#525252"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View>
            <Text className="text-neutral-300 mb-1 text-sm">Password</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white"
              placeholder="Your password"
              placeholderTextColor="#525252"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            className="bg-blue-500 rounded-lg py-3 items-center mt-2"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-neutral-400">Don't have an account? </Text>
            <Link href="/(auth)/register" className="text-blue-500">
              Sign Up
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
