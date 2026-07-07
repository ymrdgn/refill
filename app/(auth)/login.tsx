import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signIn, signUp } from '@/lib/supabase';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

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
          {/* Marka */}
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>{t('sheets.tagline')}</Text>
            <Text style={styles.logo}>Refill</Text>
          </View>

          {/* Segment geçişi: Giriş | Kayıt */}
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentItem, !isSignUp && styles.segmentActive]}
              onPress={() => switchMode('login')}
            >
              <Text
                style={[
                  styles.segmentText,
                  !isSignUp && styles.segmentTextActive,
                ]}
              >
                {t('auth.login')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentItem, isSignUp && styles.segmentActive]}
              onPress={() => switchMode('signup')}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSignUp && styles.segmentTextActive,
                ]}
              >
                {t('auth.signup')}
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder={t('auth.username')}
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.inkSoft}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? t('auth.signup') : t('auth.login')}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Alt geçiş bağlantısı */}
          <Pressable
            style={styles.switchLink}
            onPress={() => switchMode(isSignUp ? 'login' : 'signup')}
          >
            <Text style={styles.switchText}>
              {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  brand: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoMark: { width: 96, height: 96, marginBottom: spacing.md },
  tagline: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: fontSize['4xl'],
    color: colors.ink,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.ink },
  segmentText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
    color: colors.inkSoft,
  },
  segmentTextActive: { color: colors.surface },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    marginTop: -spacing.xs,
  },
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xs,
    ...shadow.primary,
  },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  buttonText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: fontSize.md,
  },
  switchLink: { alignItems: 'center', marginTop: spacing.xl },
  switchText: {
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
  },
});
