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
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/auth-provider';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      Alert.alert(t('auth.registrationFailed'), error.message);
    } else {
      Alert.alert(t('auth.registrationSuccess'), t('auth.checkEmail'));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-neutral-950"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-white mb-2">JouBuild</Text>
        <Text className="text-neutral-400 mb-8">{t('auth.signUpSubtitle')}</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-neutral-300 mb-1 text-sm">{t('auth.email')}</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white"
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor="#525252"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View>
            <Text className="text-neutral-300 mb-1 text-sm">{t('auth.password')}</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white"
              placeholder={t('auth.choosePasswordPlaceholder')}
              placeholderTextColor="#525252"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View>
            <Text className="text-neutral-300 mb-1 text-sm">{t('auth.confirmPassword')}</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white"
              placeholder={t('auth.repeatPasswordPlaceholder')}
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
              <Text className="text-white font-semibold text-base">{t('auth.signUp')}</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-neutral-400">{t('auth.hasAccount')}</Text>
            <Link href="/(auth)/login" className="text-blue-500">
              {t('auth.signIn')}
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
