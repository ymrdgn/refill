import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Dices, Minus, Plus } from 'lucide-react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';
import { Button, TopBar } from '@/components/ui';
import Dice3D from '@/components/Dice3D';

const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;

const MIN_DICE = 1;
const MAX_DICE = 6;

/** Sallama algısı: ivme büyüklüğü (g) bu eşiği aşarsa zarlar dönmeye başlar. */
const SHAKE_THRESHOLD = 1.55;
/** Sallama kesildikten sonra zarların "düşmesi" için beklenen süre (ms). */
const SETTLE_MS = 650;

export default function DiceScreen() {
  const { t } = useTranslation();

  const [sides, setSides] = useState<number>(6);
  const [count, setCount] = useState(2);
  const [results, setResults] = useState<number[] | null>(null);
  const [tumbling, setTumbling] = useState(false);

  const sidesRef = useRef(sides);
  sidesRef.current = sides;
  const countRef = useRef(count);
  countRef.current = count;
  const tumblingRef = useRef(false);
  const lastShakeRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticGateRef = useRef(0);

  const rollOnce = (s: number) => 1 + Math.floor(Math.random() * s);
  const randomResults = () =>
    Array.from({ length: countRef.current }, () => rollOnce(sidesRef.current));

  const lightTick = () => {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - hapticGateRef.current < 160) return;
    hapticGateRef.current = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /** Zarlar düşer: son değerler üretilir; 3B sahne doğru yüzü kameraya çevirir. */
  const land = useCallback(() => {
    if (!tumblingRef.current) return;
    tumblingRef.current = false;
    setTumbling(false);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setResults(randomResults());
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Zarlar yuvarlanmaya başlar (3B sahnede takla + zıplama). */
  const startTumble = useCallback(() => {
    if (tumblingRef.current) return;
    tumblingRef.current = true;
    setTumbling(true);
    tickRef.current = setInterval(() => {
      lightTick();
      if (Date.now() - lastShakeRef.current > SETTLE_MS) land();
    }, 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [land]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    (async () => {
      const ok = await Accelerometer.isAvailableAsync().catch(() => false);
      if (!ok) return;
      Accelerometer.setUpdateInterval(70);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const mag = Math.sqrt(x * x + y * y + z * z);
        if (mag > SHAKE_THRESHOLD) {
          lastShakeRef.current = Date.now();
          if (!tumblingRef.current) startTumble();
        }
      });
    })();
    return () => {
      sub?.remove();
      if (tickRef.current) clearInterval(tickRef.current);
      tumblingRef.current = false;
    };
  }, [startTumble]);

  const selectSides = (d: number) => {
    setSides(d);
    setResults(null);
  };

  const changeCount = (delta: number) => {
    setCount((c) => Math.min(MAX_DICE, Math.max(MIN_DICE, c + delta)));
    setResults(null);
  };

  const buttonRoll = () => {
    if (tumblingRef.current) return;
    lastShakeRef.current = Date.now() + 250;
    startTumble();
  };

  const trayHeight = count <= 3 ? 320 : 430;

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
                onPress={() => selectSides(d)}
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

        <Text style={styles.shakeHint}>{t('tools.shakeHint')}</Text>

        {/* 3B zar tepsisi */}
        <View style={styles.tray}>
          <Dice3D
            sides={sides}
            count={count}
            tumbling={tumbling}
            results={results}
            height={trayHeight}
          />
        </View>

        <Button
          label={results ? t('tools.rollAgain') : t('tools.roll')}
          onPress={buttonRoll}
          disabled={tumbling}
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
    gap: spacing.xs + 2,
    marginBottom: spacing.xl,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
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
    marginBottom: spacing.lg,
    ...shadow.card,
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
  shakeHint: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  tray: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
});
