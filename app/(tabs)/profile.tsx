import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, signOut } from '@/lib/supabase';
import { clearAll } from '@/lib/db/local';
import { colors, fonts } from '@/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(({ user }) => setEmail(user?.email ?? null));
  }, []);

  const handleSignOut = async () => {
    await signOut();
    await clearAll(); // yerel veriyi temizle (başka kullanıcıya sızmasın)
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        {email && <Text style={styles.email}>{email}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  email: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: colors.danger,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
});
