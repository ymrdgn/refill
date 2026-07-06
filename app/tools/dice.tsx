import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Dices, Minus, Plus } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';

const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;
const MIN_DICE = 1;
const MAX_DICE = 6;

export default function DiceScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [sides, setSides] = useState<number>(6);
  const [count, setCount] = useState(2);
  const [results, setResults] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const changeCount = (delta: number) => {
    setCount((c) => Math.min(MAX_DICE, Math.max(MIN_DICE, c + delta)));
    setResults(null);
  };

  const rollOnce = (s: number) => 1 + Math.floor(Math.random() * s);

  /** Kısa yuvarlanma animasyonu: değerler hızla değişip son atışta durur. */
  const roll = () => {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const totalTicks = 10;
    timerRef.current = setInterval(() => {
      ticks += 1;
      setResults(Array.from({ length: count }, () => rollOnce(sides)));
      if (ticks >= totalTicks && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setRolling(false);
      }
    }, 80);
  };

  const total = results ? results.reduce((a, b) => a + b, 0) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle}>{t('tools.dice')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Zar tipi */}
        <View style={styles.typeRow}>
          {DICE_TYPES.map((d) => {
            const active = sides === d;
            return (
              <Pressable
                key={d}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => {
                  setSides(d);
                  setResults(null);
                }}
              >
                <Text style={[styles.typeText, active && styles.typeTextActive]}>
                  D{d}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Zar sayısı */}
        <Text style={styles.label}>{t('tools.diceCount')}</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepBtn, count <= MIN_DICE && styles.stepBtnDisabled]}
            onPress={() => changeCount(-1)}
            disabled={count <= MIN_DICE}
          >
            <Minus size={20} color={count <= MIN_DICE ? colors.inkSoft : colors.ink} />
          </Pressable>
          <Text style={styles.stepValue}>{count}</Text>
          <Pressable
            style={[styles.stepBtn, count >= MAX_DICE && styles.stepBtnDisabled]}
            onPress={() => changeCount(1)}
            disabled={count >= MAX_DICE}
          >
            <Plus size={20} color={count >= MAX_DICE ? colors.inkSoft : colors.ink} />
          </Pressable>
        </View>

        {/* Sonuçlar */}
        {results && (
          <View style={styles.resultCard}>
            <View style={styles.diceRow}>
              {results.map((r, i) => (
                <View key={i} style={styles.die}>
                  <Text style={styles.dieValue}>{r}</Text>
                </View>
              ))}
            </View>
            {results.length > 1 && !rolling && (
              <Text style={styles.totalText}>
                {t('tools.total')}: <Text style={styles.totalValue}>{total}</Text>
              </Text>
            )}
          </View>
        )}

        <Pressable style={styles.primaryBtn} onPress={roll} disabled={rolling}>
          <Dices size={18} color={colors.white} />
          <Text style={styles.primaryBtnText}>
            {results ? t('tools.rollAgain') : t('tools.roll')}
          </Text>
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  typeText: { fontFamily: fonts.semibold, fontSize: fontSize.base, color: colors.inkSoft },
  typeTextActive: { color: colors.surface },
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  diceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  die: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieValue: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.ink },
  totalText: {
    marginTop: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.inkSoft,
  },
  totalValue: { fontFamily: fonts.display, color: colors.ink },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: 15,
  },
  primaryBtnText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSize.md },
});
