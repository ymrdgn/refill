/**
 * Paywall — Bireysel ve Aile yıllık abonelikleri.
 *
 * Buraya iki farklı ihtiyaçla gelinir; bu yüzden plan GELDİĞİ YERE göre
 * ön-seçili açılır (`/paywall?plan=family`):
 *   - ana ekran, kota dolunca      → Bireysel (kullanıcı kağıt istiyor)
 *   - aile ekranı, paylaşım kilidi → Aile (Bireysel bu ihtiyacı çözmez)
 *
 * Business paketi bilerek YOK: uygulama içinden satılmıyor (mağaza komisyonu
 * + B2B fatura akışı). En altta yalnızca iletişim satırı var.
 *
 * Fiyatlar RevenueCat teklifinden (offerings) gelecek; henüz bağlı olmadığı
 * için fiyat yerine "yakında" gösterilir ve CTA uyarı verir (lib/purchases.ts).
 * Aile satın alındığında aile ekranına gidilir; aile kaydı orada kendiliğinden
 * açılır ve kullanıcı doğrudan davet adımına düşer.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Camera, Check, Cloud, Sparkles, Users, X } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';
import { Button } from '@/components/ui';
import { FREE_PHOTO_SHEETS } from '@/lib/entitlements';
import { FAMILY_SEATS } from '@/lib/orgs';
import { buyPlan, restorePurchases, type PlanId } from '@/lib/purchases';
import { legalUrl } from '@/lib/links';

const BUSINESS_EMAIL = process.env.EXPO_PUBLIC_BUSINESS_EMAIL;

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { plan } = useLocalSearchParams<{ plan?: PlanId }>();

  const fromRoute: PlanId = plan === 'family' ? 'family' : 'individual';
  const [selected, setSelected] = useState<PlanId>(fromRoute);

  // useState'in başlangıç değeri yalnızca mount'ta okunur; ekran zaten açıkken
  // farklı bir plan parametresiyle gelinirse seçim burada güncellenir.
  useEffect(() => {
    setSelected(fromRoute);
  }, [fromRoute]);

  const comingSoon = () => {
    Alert.alert(t('paywall.title'), t('paywall.comingSoon'));
  };

  /** Satın alma sonrası: aile → aile ekranı (davet adımı), bireysel → geri. */
  const afterPurchase = (plan: PlanId) => {
    if (plan === 'family') router.replace('/org');
    else router.back();
  };

  const purchase = async () => {
    const ok = await buyPlan(selected);
    if (!ok) return comingSoon();
    afterPurchase(selected);
  };

  const restore = async () => {
    const ok = await restorePurchases();
    if (!ok) return comingSoon();
    afterPurchase(selected);
  };

  // Aile, Bireysel'in üstüne paylaşımı ekler; liste seçime göre uzar.
  const features = [
    { icon: Camera, text: t('paywall.feature1') },
    { icon: Cloud, text: t('paywall.feature2') },
    ...(selected === 'family'
      ? [
          {
            icon: Users,
            text: t('paywall.feature4', { seats: FAMILY_SEATS }),
          },
        ]
      : []),
    { icon: Sparkles, text: t('paywall.feature3') },
  ];

  // Her kart hangi dönem için ödendiğini AÇIKÇA söylemeli: "Yıllık abonelik · …"
  const plans: { id: PlanId; name: string; note: string; best?: boolean }[] = [
    {
      id: 'individual',
      name: t('paywall.planIndividual'),
      note: `${t('paywall.yearly')} · ${t('paywall.yearlyNote')}`,
    },
    {
      id: 'family',
      name: t('paywall.planFamily'),
      note: `${t('paywall.yearly')} · ${t('paywall.familySeats', {
        seats: FAMILY_SEATS,
      })}`,
      best: true,
    },
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

        {plans.map((p) => {
          const active = selected === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.planCard, active && styles.planCardActive]}
              onPress={() => setSelected(p.id)}
            >
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{p.name}</Text>
                <Text style={styles.planNote}>{p.note}</Text>
                {/* Fiyat RevenueCat bağlanınca buraya gelecek. */}
                <Text style={styles.planPrice}>{t('paywall.priceSoon')}</Text>
              </View>

              {p.best && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>
                    {t('paywall.bestValue')}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <Button
          label={
            selected === 'family' ? t('paywall.ctaFamily') : t('paywall.cta')
          }
          onPress={purchase}
        />

        <Pressable onPress={restore} style={styles.restoreLink}>
          <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.laterLink}>
          <Text style={styles.laterText}>{t('paywall.later')}</Text>
        </Pressable>

        {/* Apple/Google abonelik kuralı: yenileme koşulu + gizlilik ve şartlar bağlantıları */}
        <Text style={styles.legalNote}>{t('paywall.legalNote')}</Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => Linking.openURL(legalUrl('privacy'))} hitSlop={8}>
            <Text style={styles.legalLink}>{t('paywall.privacy')}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(legalUrl('terms'))} hitSlop={8}>
            <Text style={styles.legalLink}>{t('paywall.terms')}</Text>
          </Pressable>
        </View>

        {!!BUSINESS_EMAIL && (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${BUSINESS_EMAIL}`)}
            style={styles.businessLink}
          >
            <Text style={styles.businessText}>{t('paywall.business')}</Text>
          </Pressable>
        )}
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
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  planCardActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  planPrice: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginTop: 4,
  },
  businessLink: { alignItems: 'center', marginTop: spacing.xl },
  businessText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
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
  legalNote: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legalLink: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
  legalDot: { color: colors.inkSoft, fontSize: fontSize.xs },
  laterText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
  },
});
