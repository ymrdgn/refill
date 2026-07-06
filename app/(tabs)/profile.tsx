import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react-native';
import { getCurrentUser, signOut } from '@/lib/supabase';
import { clearAll } from '@/lib/db/local';
import { sync } from '@/lib/db/sync';
import { changeLanguage } from '@/i18n';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      setEmail(user?.email ?? null);
      setUid(user?.id ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    // Bekleyen yerel değişiklikleri kaybetmemek için önce senkronu dene.
    if (uid) await sync(uid).catch(() => {});
    await signOut();
    await clearAll(); // yerel veriyi temizle (başka kullanıcıya sızmasın)
    router.replace('/(auth)/login');
  };

  const initial = (email?.[0] ?? '?').toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        {/* Hesap kartı */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{t('profile.account')}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email ?? '—'}
            </Text>
          </View>
        </View>

        {/* Dil seçimi */}
        <Text style={styles.sectionLabel}>{t('profile.language')}</Text>
        <View style={styles.langRow}>
          {LANGS.map((l) => {
            const active = i18n.language === l.code;
            return (
              <Pressable
                key={l.code}
                style={({ pressed }) => [
                  styles.langChip,
                  active && styles.langChipActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text
                  style={[styles.langText, active && styles.langTextActive]}
                >
                  {l.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Çıkış */}
        <Pressable
          style={({ pressed }) => [
            styles.signOut,
            signingOut && { opacity: 0.6 },
            pressed && styles.pressed,
          ]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <LogOut size={17} color={colors.danger} />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize['3xl'],
    color: colors.ink,
    marginBottom: spacing.xl,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    color: colors.surface,
  },
  cardLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  email: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
    color: colors.ink,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  langRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
  langChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  langChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  langText: { fontFamily: fonts.semibold, fontSize: fontSize.base, color: colors.inkSoft },
  langTextActive: { color: colors.surface },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  signOutText: {
    color: colors.danger,
    fontFamily: fonts.semibold,
    fontSize: fontSize.md,
  },
});
