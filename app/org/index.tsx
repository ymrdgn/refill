/**
 * Aile ekranı — Duolingo tipi koltuk paketi.
 *
 * Aile planını satın alan kişinin entitlements satırı (plan = 'family')
 * kaynaktır. Aile kaydı burada kendiliğinden açılır (create_organization
 * aile için idempotenttir); kullanıcı doğrudan "davet et" adımına düşer.
 * Üyeler sınırsız fotoğraf kağıdı hakkı kazanır; kağıtlar aile içinde
 * PAYLAŞILMAZ (bir oyun için tek kişinin skor tutması yeter).
 *
 * Durumlar:
 *   - aile yok, plan yok    → tanıtım kartı → paywall (?plan=family)
 *   - aile var, plan pasif  → üyeler + "planı yenile" kartı (davet kapalı)
 *   - aile var, plan aktif  → üyeler + davet butonu (koltuk kaldıkça)
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LogOut, Sparkles, UserPlus, Users } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';
import { Button, TopBar } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  FAMILY_SEATS,
  createInvite,
  createOrganization,
  getMyFamily,
  isPlanActive,
  listMembers,
  removeMember,
} from '@/lib/orgs';
import { getEntitlement } from '@/lib/entitlements';
import { inviteLink } from '@/lib/links';
import { sync } from '@/lib/db/sync';
import type { Organization, OrgMember } from '@/lib/database.types';

export default function OrgScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  /** Plan var ama aile açılamadı (ağ yok / şema uygulanmamış). */
  const [setupFailed, setSetupFailed] = useState(false);

  const readLocal = useCallback(async () => {
    if (!userId) return null;
    const family = await getMyFamily(userId);
    setOrg(family);
    setMembers(family ? await listMembers(family.id) : []);
    return family;
  }, [userId]);

  /**
   * 1) yereli anında göster, 2) senkron, 3) plan alınmış ama aile yoksa aç,
   * 4) yereli yeniden oku. Aile yerelde yoksa yükleme göstergesi sona kadar
   * kalır ki tanıtım kartı bir an görünüp kaybolmasın.
   */
  const refresh = useCallback(async () => {
    if (!userId) return;
    setSetupFailed(false);
    if (await readLocal()) setLoading(false);

    await sync(userId);
    let family = await getMyFamily(userId);

    if (!family) {
      const ent = await getEntitlement();
      if (ent.isPro && ent.plan === 'family') {
        try {
          await createOrganization(t('org.defaultName'), 'family');
          await sync(userId);
          family = await getMyFamily(userId);
        } catch {
          setSetupFailed(true);
        }
      }
    }

    await readLocal();
    setLoading(false);
  }, [userId, readLocal, t]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const invite = async () => {
    if (!org || !userId || busy) return;
    setBusy(true);
    try {
      // Tek kullanımlık: bir bağlantı = bir koltuk. Link yanlış ellere geçse
      // bile en fazla bir kişi girebilir, sonrasında geçersizdir.
      const token = await createInvite(org.id, userId, {
        expiresInDays: 14,
        maxUses: 1,
      });
      const link = inviteLink(token);
      const message = t('org.inviteMessage');
      // iOS bağlantıyı ayrı alandan tanır; Android yalnızca message okur.
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: link }
          : { message: `${message}\n${link}` }
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    if (!org || !userId) return;
    Alert.alert(t('org.leave'), t('org.leaveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('org.leave'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(org.id, userId);
            await sync(userId);
            await readLocal();
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? '');
          }
        },
      },
    ]);
  };

  const kick = async (memberId: string) => {
    if (!org || !userId) return;
    try {
      await removeMember(org.id, memberId);
      await sync(userId);
      await readLocal();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? '');
    }
  };

  const goPlans = () => router.push('/paywall?plan=family');

  const myRole = members.find((m) => m.user_id === userId)?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = isOwner || myRole === 'admin';
  const planActive = isPlanActive(org);
  const seats = org?.seat_limit ?? FAMILY_SEATS;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title={t('org.title')} />

      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
        ) : !org ? (
          /* ---------- Aile yok: tanıtım (plan satın alınınca aile kendiliğinden açılır) ---------- */
          <View style={styles.card}>
            <View style={styles.icon}>
              <Users size={22} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>{t('org.pitchTitle')}</Text>
            <Text style={styles.cardText}>
              {setupFailed
                ? t('org.setupFailed')
                : t('org.pitchText', { seats: FAMILY_SEATS })}
            </Text>
            <View style={{ marginTop: spacing.md }}>
              {setupFailed ? (
                <Button label={t('org.retry')} onPress={refresh} />
              ) : (
                <Button label={t('org.goFamily')} onPress={goPlans} />
              )}
            </View>
          </View>
        ) : (
          <>
            {/* ---------- Aile var ---------- */}
            <View style={styles.card}>
              <Text style={styles.orgName}>{org.name}</Text>
              <Text style={styles.cardText}>
                {t('org.seats', { used: members.length, total: seats })}
              </Text>
            </View>

            {!planActive && (
              <Pressable
                style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}
                onPress={goPlans}
              >
                <View style={styles.icon}>
                  <Sparkles size={20} color={colors.accent} />
                </View>
                <Text style={styles.cardTitle}>{t('org.planInactive')}</Text>
                <Text style={styles.cardText}>
                  {t('org.planInactiveHint', { seats })}
                </Text>
                <View style={styles.planCta}>
                  <Text style={styles.planCtaText}>{t('org.goFamily')}</Text>
                </View>
              </Pressable>
            )}

            <Text style={styles.sectionLabel}>{t('org.members')}</Text>
            {members.map((m) => (
              <View key={m.user_id} style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(m.user_id === userId ? t('org.you') : '?')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.user_id === userId ? t('org.you') : t('org.member')}
                  </Text>
                  <Text style={styles.memberRole}>{t(`org.role_${m.role}`)}</Text>
                </View>
                {isAdmin && m.user_id !== userId && (
                  <Pressable onPress={() => kick(m.user_id)} hitSlop={8}>
                    <Text style={styles.removeText}>{t('org.remove')}</Text>
                  </Pressable>
                )}
              </View>
            ))}

            {isAdmin && planActive && members.length < seats && (
              <Pressable
                style={({ pressed }) => [styles.inviteBtn, pressed && styles.pressed]}
                onPress={invite}
                disabled={busy}
              >
                <UserPlus size={17} color={colors.surface} />
                <Text style={styles.inviteText}>{t('org.invite')}</Text>
              </Pressable>
            )}

            {/* Sahip ayrılamaz: aile onun aboneliğine bağlıdır. */}
            {!isOwner && (
              <Pressable
                style={({ pressed }) => [styles.leaveBtn, pressed && styles.pressed]}
                onPress={leave}
              >
                <LogOut size={16} color={colors.danger} />
                <Text style={styles.leaveText}>{t('org.leave')}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.md, paddingBottom: 40 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accentSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  planCta: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  planCtaText: {
    color: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    marginTop: 4,
    lineHeight: 20,
  },
  orgName: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: fontSize.base,
    color: colors.surface,
  },
  memberName: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  memberRole: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
  },
  removeText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 15,
    marginTop: spacing.md,
    ...shadow.primary,
  },
  inviteText: {
    color: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: fontSize.md,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 15,
    marginTop: spacing.lg,
  },
  leaveText: {
    color: colors.danger,
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
  },
});
