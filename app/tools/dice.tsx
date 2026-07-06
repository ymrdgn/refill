import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Dices, Minus, Plus } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';
import { Button, TopBar } from '@/components/ui';

const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;
const MIN_DICE = 1;
const MAX_DICE = 6;

export default function DiceScreen() {
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
      <TopBar title={t('tools.dice')} />

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

        <Button
          label={results ? t('tools.rollAgain') : t('tools.roll')}
          onPress={roll}
          disabled={rolling}
          icon={<Dices size={18} color={colors.white} />}
        />

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
    ...shadow.card,
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
});
