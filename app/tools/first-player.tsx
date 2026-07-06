import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Minus, Plus, Shuffle, Sparkles } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

export default function FirstPlayerScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [count, setCount] = useState(4);
  const [picked, setPicked] = useState<number | null>(null);
  const [order, setOrder] = useState<number[] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ekrandan çıkarken animasyon zamanlayıcısını temizle
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const changeCount = (delta: number) => {
    setCount((c) => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, c + delta)));
    setPicked(null);
    setOrder(null);
  };

  /** Kısa "rulet" animasyonu: hızlıca numara değiştirip birinde durur. */
  const pick = () => {
    if (spinning) return;
    setOrder(null);
    setSpinning(true);
    let ticks = 0;
    const totalTicks = 14;
    timerRef.current = setInterval(() => {
      ticks += 1;
      setPicked(1 + Math.floor(Math.random() * count));
      if (ticks >= totalTicks && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setSpinning(false);
      }
    }, 90);
  };

  /** Fisher–Yates ile tam oyun sırası üretir. */
  const shuffleOrder = () => {
    if (spinning) return;
    setPicked(null);
    const arr = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle}>{t('tools.firstPlayer')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Oyuncu sayısı */}
        <Text style={styles.label}>{t('tools.players')}</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepBtn, count <= MIN_PLAYERS && styles.stepBtnDisabled]}
            onPress={() => changeCount(-1)}
            disabled={count <= MIN_PLAYERS}
          >
            <Minus size={20} color={count <= MIN_PLAYERS ? colors.inkSoft : colors.ink} />
          </Pressable>
          <Text style={styles.stepValue}>{count}</Text>
          <Pressable
            style={[styles.stepBtn, count >= MAX_PLAYERS && styles.stepBtnDisabled]}
            onPress={() => changeCount(1)}
            disabled={count >= MAX_PLAYERS}
          >
            <Plus size={20} color={count >= MAX_PLAYERS ? colors.inkSoft : colors.ink} />
          </Pressable>
        </View>

        {/* Sonuç alanı */}
        {picked != null && (
          <View style={styles.resultCard}>
            <Text style={styles.resultPlayer}>
              {t('tools.playerN', { n: picked })}
            </Text>
            {!spinning && <Text style={styles.resultSub}>{t('tools.starts')}</Text>}
          </View>
        )}

        {order && (
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>{t('tools.orderTitle')}</Text>
            {order.map((p, i) => (
              <View key={p} style={styles.orderRow}>
                <Text style={styles.orderIdx}>{i + 1}.</Text>
                <Text style={styles.orderName}>{t('tools.playerN', { n: p })}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Aksiyonlar */}
        <Pressable style={styles.primaryBtn} onPress={pick} disabled={spinning}>
          <Sparkles size={18} color={colors.white} />
          <Text style={styles.primaryBtnText}>{t('tools.pick')}</Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={shuffleOrder} disabled={spinning}>
          <Shuffle size={16} color={colors.ink} />
          <Text style={styles.ghostBtnText}>{t('tools.shuffleOrder')}</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  topTitle: { flex: 1, fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.ink },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 40 },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepBtnDisabled: { opacity: 0.5 },
  stepValue: { fontFamily: fonts.display, fontSize: fontSize['3xl'], color: colors.ink },
  resultCard: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl,
  },
  resultPlayer: { fontFamily: fonts.display, fontSize: fontSize['3xl'], color: colors.ink },
  resultSub: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  orderTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.sm,
    color: colors.ink,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  orderIdx: { fontFamily: fonts.semibold, fontSize: fontSize.base, color: colors.accent, width: 26 },
  orderName: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.ink },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: 15,
    marginBottom: spacing.md,
  },
  primaryBtnText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSize.md },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  ghostBtnText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSize.base },
});
