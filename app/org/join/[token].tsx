/**
 * Davet bağlantısıyla aileye katılma: <LINK_BASE>/org/join/<token>
 * (web/index.html sayfası bunu refill://org/join/<token> ile uygulamaya açar).
 *
 * Katılım sunucudaki redeem_org_invite() RPC'siyle yapılır; koltuk limiti ve
 * plan kontrolü orada uygulanır. Buradaki iş yalnızca sonucu anlaşılır bir
 * mesaja çevirmek. Oturum yoksa token saklanır, girişten sonra buraya
 * otomatik dönülür (bkz. lib/links.ts, app/(auth)/login.tsx).
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, Users, X } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { Button, TopBar } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { redeemInvite } from '@/lib/orgs';
import { setPendingInvite } from '@/lib/links';
import { sync } from '@/lib/db/sync';

type State = 'working' | 'ok' | 'invalid' | 'full' | 'error';

export default function JoinOrgScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId, loading: authLoading } = useAuth();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [state, setState] = useState<State>('working');

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (!userId) {
        // Oturum yoksa token'ı sakla; giriş ekranı başarıda buraya döner.
        await setPendingInvite(String(token));
        router.replace('/(auth)/login');
        return;
      }
      try {
        await redeemInvite(String(token));
        await sync(userId).catch(() => {});
        setState('ok');
      } catch (e: any) {
        const msg = String(e?.message ?? '');
        if (msg.includes('seat_limit_exceeded')) setState('full');
        else if (msg.includes('invalid_invite')) setState('invalid');
        else setState('error');
      }
    })();
  }, [authLoading, userId, token, router]);

  const body = {
    working: { icon: null, title: t('org.joining'), text: '' },
    ok: { icon: 'ok', title: t('org.joinSuccess'), text: t('org.joinSuccessHint') },
    invalid: { icon: 'no', title: t('org.joinInvalid'), text: '' },
    full: { icon: 'no', title: t('org.joinFull'), text: t('org.joinFullHint') },
    error: { icon: 'no', title: t('common.error'), text: '' },
  }[state];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title={t('org.joinTitle')} />
      <View style={styles.body}>
        <View style={styles.icon}>
          {state === 'working' ? (
            <ActivityIndicator color={colors.accent} />
          ) : body.icon === 'ok' ? (
            <Check size={26} color={colors.green} />
          ) : (
            <X size={26} color={colors.danger} />
          )}
        </View>

        <Text style={styles.title}>{body.title}</Text>
        {!!body.text && <Text style={styles.text}>{body.text}</Text>}

        {state !== 'working' && (
          <View style={styles.actions}>
            <Button
              label={state === 'ok' ? t('org.goToSheets') : t('org.title')}
              onPress={() => router.replace(state === 'ok' ? '/(tabs)' : '/org')}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  actions: { alignSelf: 'stretch', marginTop: spacing.xl },
});
