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

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Registration failed', error.message);
    } else {
      Alert.alert('Success', 'Check your email to confirm your account.');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-neutral-950"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-white mb-2">JouBuild</Text>
        <Text className="text-neutral-400 mb-8">Create a new account</Text>

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
              placeholder="Choose a password"
              placeholderTextColor="#525252"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View>
            <Text className="text-neutral-300 mb-1 text-sm">Confirm Password</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white"
              placeholder="Repeat your password"
              placeholderTextColor="#525252"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <TouchableOpacity
            className="bg-blue-500 rounded-lg py-3 items-center mt-2"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign Up</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-neutral-400">Already have an account? </Text>
            <Link href="/(auth)/login" className="text-blue-500">
              Sign In
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
