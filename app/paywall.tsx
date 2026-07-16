/**
 * Paywall — Refill Pro (yıllık abonelik).
 *
 * Ücretsiz fotoğraf kağıdı kotası dolunca buraya yönlendirilir.
 * Satın alma akışı henüz bağlı değil (RevenueCat entegrasyonu sonra);
 * CTA şimdilik "yakında" uyarısı gösterir.
 */
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Camera, Check, Cloud, Sparkles, X } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';
import { Button } from '@/components/ui';
import { FREE_PHOTO_SHEETS } from '@/lib/entitlements';

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const comingSoon = () => {
    Alert.alert('Refill Pro', t('paywall.comingSoon'));
  };

  const features = [
    { icon: Camera, text: t('paywall.feature1') },
    { icon: Cloud, text: t('paywall.feature2') },
    { icon: Sparkles, text: t('paywall.feature3') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
        <X size={22} color={colors.inkSoft} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Sparkles size={26} color={colors.accent} />
          </View>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>
            {t('paywall.quotaReached', { limit: FREE_PHOTO_SHEETS })}
          </Text>
        </View>

        <View style={styles.card}>
          {features.map(({ icon: Icon, text }, i) => (
            <View key={i} style={[styles.featureRow, i > 0 && styles.featureDivider]}>
              <View style={styles.featureIcon}>
                <Icon size={16} color={colors.accent} />
              </View>
              <Text style={styles.featureText}>{text}</Text>
              <Check size={16} color={colors.accent} />
            </View>
          ))}
        </View>

        <View style={styles.planCard}>
          <View>
            <Text style={styles.planName}>{t('paywall.yearly')}</Text>
            <Text style={styles.planNote}>{t('paywall.yearlyNote')}</Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{t('paywall.bestValue')}</Text>
          </View>
        </View>

        <Button label={t('paywall.cta')} onPress={comingSoon} />

        <Pressable onPress={comingSoon} style={styles.restoreLink}>
          <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.laterLink}>
          <Text style={styles.laterText}>{t('paywall.later')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize['3xl'],
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  featureDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  planName: {
    fontFamily: fonts.display,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  planNote: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    marginTop: 2,
  },
  planBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  restoreLink: { alignItems: 'center', marginTop: spacing.lg },
  restoreText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
  laterLink: { alignItems: 'center', marginTop: spacing.md },
  laterText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
  },
});
