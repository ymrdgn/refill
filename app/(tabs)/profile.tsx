import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { LANGUAGES, findLanguage, isRTL } from '@/lib/languages';
import { getCurrentUser, signOut } from '@/lib/supabase';
import { FREE_PHOTO_SHEETS, getEntitlement } from '@/lib/entitlements';
import { isPlanActive, listMyOrgs } from '@/lib/orgs';
import { clearAll } from '@/lib/db/local';
import { removeAllLocalImages } from '@/lib/images';
import { sync } from '@/lib/db/sync';
import { changeLanguage } from '@/i18n';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  /** Görünen plan: kendi aboneliğim ya da aktif planlı bir ailenin üyeliği. */
  const [plan, setPlan] = useState<'free' | 'individual' | 'family'>('free');

  const current = findLanguage(i18n.language);

  /**
   * Dili değiştirir. Sağdan sola yazılan bir dile (ar/fa) geçişte yerleşimin
   * dönmesi için I18nManager gerekir ve bu ancak uygulama yeniden açılınca
   * etkili olur — bu yüzden kullanıcıya söylüyoruz, sessizce yarım bırakmıyoruz.
   */
  const pickLanguage = async (code: string) => {
    setLangOpen(false);
    await changeLanguage(code);

    const shouldBeRTL = isRTL(code);
    // isRTL yalnızca uygulama açılışında okunur; forceRTL bir sonraki açılış için
    // yazar. Bu yüzden bayrağı HER seçimde yazmalıyız — yoksa ar/fa'dan çıkınca
    // eski RTL isteği asılı kalır ve uygulama yeniden açılınca LTR dili ters çizer.
    const wasRTL = I18nManager.isRTL;
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);

    // Uyarı yalnızca ekrandaki yerleşim gerçekten bayatladıysa gösterilir.
    if (shouldBeRTL !== wasRTL) {
      // t() bu kapanışta bir önceki dile bağlı kalır; i18n.t her zaman güncel dili verir.
      Alert.alert(i18n.t('profile.restartTitle'), i18n.t('profile.restartBody'));
    }
  };

  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      setEmail(user?.email ?? null);
      setUid(user?.id ?? null);
    });
  }, []);

  // Her odaklanmada tazele: paywall'dan / aile ekranından dönünce güncel olsun.
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      (async () => {
        const ent = await getEntitlement();
        if (ent.plan === 'family') return setPlan('family');
        const orgs = await listMyOrgs(uid);
        if (orgs.some((o) => o.kind === 'family' && isPlanActive(o))) {
          return setPlan('family');
        }
        setPlan(ent.isPro ? 'individual' : 'free');
      })();
    }, [uid])
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    // Bekleyen yerel değişiklikleri kaybetmemek için önce senkronu dene.
    if (uid) await sync(uid).catch(() => {});
    await signOut();
    await clearAll(); // yerel veriyi temizle (başka kullanıcıya sızmasın)
    removeAllLocalImages(); // kağıt fotoğrafları da cihazda kalmasın
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

        {/* Plan: paketler ve (aile planında) üye yönetimi buradan. Ayrı "Aile" satırı yok. */}
        <Pressable
          style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}
          onPress={() => router.push(plan === 'family' ? '/org' : '/paywall')}
        >
          <View style={styles.planIcon}>
            <Sparkles size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{t('profile.plan')}</Text>
            <Text style={styles.planName}>
              {plan === 'family'
                ? t('paywall.planFamily')
                : plan === 'individual'
                  ? t('paywall.planIndividual')
                  : t('profile.planFree')}
            </Text>
            <Text style={styles.planHint}>
              {plan === 'free'
                ? t('profile.planFreeHint', { limit: FREE_PHOTO_SHEETS })
                : t('profile.planProHint')}
            </Text>
          </View>
          {plan === 'free' ? (
            <View style={styles.planCta}>
              <Text style={styles.planCtaText}>{t('org.goFamily')}</Text>
            </View>
          ) : (
            <ChevronRight size={18} color={colors.inkSoft} />
          )}
        </Pressable>

        {/* Dil seçimi */}
        <Text style={styles.sectionLabel}>{t('profile.language')}</Text>
        <Pressable
          style={({ pressed }) => [styles.select, pressed && styles.pressed]}
          onPress={() => setLangOpen(true)}
        >
          <Text style={styles.selectValue}>{current?.label ?? i18n.language}</Text>
          <ChevronDown size={18} color={colors.inkSoft} />
        </Pressable>

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

      {/* Dil listesi */}
      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setLangOpen(false)}>
          {/* İçeriğe dokunuş modalı kapatmasın */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('profile.language')}</Text>
              <Pressable onPress={() => setLangOpen(false)} hitSlop={10}>
                <X size={20} color={colors.inkSoft} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetList}
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGES.map((l) => {
                const active = i18n.language === l.code;
                return (
                  <Pressable
                    key={l.code}
                    style={({ pressed }) => [
                      styles.option,
                      pressed && { backgroundColor: colors.bg },
                    ]}
                    onPress={() => pickLanguage(l.code)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                    >
                      {l.label}
                    </Text>
                    {active && <Check size={18} color={colors.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: spacing['2xl'],
  },
  selectValue: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
    ...shadow.card,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
    color: colors.ink,
    marginTop: 2,
  },
  planHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    marginTop: 2,
  },
  planCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  planCtaText: {
    color: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 51, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  sheetList: { paddingHorizontal: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    borderRadius: radius.md,
  },
  optionText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  optionTextActive: { fontFamily: fonts.semibold, color: colors.accent },
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
