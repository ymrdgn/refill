import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signIn, signUp } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email.trim(), password, username.trim())
        : await signIn(email.trim(), password);

      if (error) {
        setError(error.message);
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>Refill</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? t('auth.signup') : t('auth.login')}
          </Text>

          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder={t('auth.username')}
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor="#6B7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? t('auth.signup') : t('auth.login')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp((v) => !v)}>
            <Text style={styles.switchText}>
              {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    color: '#6366F1',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    marginBottom: 12,
  },
  error: {
    color: '#F87171',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  switchText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});
