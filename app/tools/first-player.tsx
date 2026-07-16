/**
 * İlk oyuncu seçimi — parmak dokunmalı meeple modu.
 *
 * Herkes bir parmağını ekrana basılı tutar; her parmağın altında
 * çizgi (outline) halinde renkli bir meeple döner. Kısa bir bekleme
 * sonrasında rastgele birinin meeple'ı dolu renge boyanır — o başlar.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { RotateCcw } from 'lucide-react-native';
import { colors, fonts, fontSize, spacing } from '@/lib/theme';
import { Button, TopBar } from '@/components/ui';

/** Klasik board game oyuncu renkleri. */
const MEEPLE_COLORS = [
  '#E5484D', // kırmızı
  '#3B82F6', // mavi
  '#22C55E', // yeşil
  '#EAB308', // sarı
  '#A855F7', // mor
  '#F97316', // turuncu
  '#14B8A6', // turkuaz
  '#EC4899', // pembe
  '#8B5A2B', // kahve
  '#64748B', // gri
];

/** Son parmak değişikliğinden kazanan seçimine kadar geçen süre. */
const PICK_DELAY_MS = 3000;
const MEEPLE_SIZE = 104;

/** Meeple silüeti (0 0 100 100). */
const MEEPLE_PATH =
  'M50 3 C57.45 3 63.5 9.05 63.5 16.5 C63.5 21.5 60.8 25.9 56.7 28.3 ' +
  'C66 31.5 74.5 36.5 81 42.5 C86.5 47.5 92.5 52 94.5 57 C96.5 62.5 91.5 66.5 86 65 ' +
  'C79 63 72.5 59.5 68.5 56 C70 64.5 73.5 72.5 78 80 C80.5 84.5 82 88.5 81.5 91.5 ' +
  'C80.8 96 74.5 97.5 69.5 96.4 C64.5 95.3 60.5 91.5 58 86.5 C55.5 81.5 53 77.5 50 77.5 ' +
  'C47 77.5 44.5 81.5 42 86.5 C39.5 91.5 35.5 95.3 30.5 96.4 C25.5 97.5 19.2 96 18.5 91.5 ' +
  'C18 88.5 19.5 84.5 22 80 C26.5 72.5 30 64.5 31.5 56 C27.5 59.5 21 63 14 65 ' +
  'C8.5 66.5 3.5 62.5 5.5 57 C7.5 52 13.5 47.5 19 42.5 C25.5 36.5 34 31.5 43.3 28.3 ' +
  'C39.2 25.9 36.5 21.5 36.5 16.5 C36.5 9.05 42.55 3 50 3 Z';

function Meeple({ color, filled }: { color: string; filled: boolean }) {
  return (
    <Svg width={MEEPLE_SIZE} height={MEEPLE_SIZE} viewBox="0 0 100 100">
      <Path
        d={MEEPLE_PATH}
        stroke={color}
        strokeWidth={filled ? 0 : 4}
        fill={filled ? color : 'none'}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Dönen outline meeple. Animasyon her mount'ta yeniden başlar;
 * paylaşılan bir loop'a bağlanmak yerine kendi Animated.Value'sunu
 * kullanır — aksi halde reset sonrası yeniden mount olan view'lar
 * çalışan native animasyona bağlanamayıp donuk kalıyor.
 */
function SpinningMeeple({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const spin = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Meeple color={color} filled={false} />
    </Animated.View>
  );
}

interface Finger {
  id: string;
  x: number;
  y: number;
  color: string;
}

export default function FirstPlayerScreen() {
  const { t } = useTranslation();

  const [fingers, setFingers] = useState<Finger[]>([]);
  const [winner, setWinner] = useState<Finger | null>(null);

  const fingersRef = useRef<Finger[]>([]);
  fingersRef.current = fingers;
  const winnerRef = useRef<Finger | null>(null);
  winnerRef.current = winner;

  /** identifier → renk; parmak kalkarsa rengi geri havuza döner. */
  const colorMapRef = useRef(new Map<string, string>());
  const arenaRef = useRef<View>(null);
  const arenaOffset = useRef({ x: 0, y: 0 });
  const pickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Kazanan "pop" animasyonu. */
  const winScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (winner) {
      winScale.setValue(0.6);
      Animated.spring(winScale, {
        toValue: 1.25,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [winner, winScale]);

  useEffect(() => {
    return () => {
      if (pickTimerRef.current) clearTimeout(pickTimerRef.current);
    };
  }, []);

  const lightTap = () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /** Aktif dokunuşlardan parmak listesini günceller. */
  const updateFingers = (e: GestureResponderEvent) => {
    if (winnerRef.current) return; // sonuç ekranında dokunuş yok sayılır
    const list = e.nativeEvent.touches;
    const next: Finger[] = [];
    const alive = new Set<string>();
    let added = false;

    for (const touch of list) {
      const id = String(touch.identifier);
      alive.add(id);
      let color = colorMapRef.current.get(id);
      if (!color) {
        const taken = new Set(colorMapRef.current.values());
        color =
          MEEPLE_COLORS.find((c) => !taken.has(c)) ??
          MEEPLE_COLORS[colorMapRef.current.size % MEEPLE_COLORS.length];
        colorMapRef.current.set(id, color);
        added = true;
      }
      next.push({
        id,
        x: touch.pageX - arenaOffset.current.x,
        y: touch.pageY - arenaOffset.current.y,
        color,
      });
    }
    // Kalkan parmakların renklerini serbest bırak
    for (const key of [...colorMapRef.current.keys()]) {
      if (!alive.has(key)) colorMapRef.current.delete(key);
    }
    if (added) lightTap();
    setFingers(next);
  };

  /** Parmak kümesi değişince seçim sayacını (yeniden) başlat. */
  const idsKey = fingers
    .map((f) => f.id)
    .sort()
    .join(',');
  useEffect(() => {
    if (pickTimerRef.current) {
      clearTimeout(pickTimerRef.current);
      pickTimerRef.current = null;
    }
    if (winner || fingers.length < 2) return;
    pickTimerRef.current = setTimeout(() => {
      const current = fingersRef.current;
      if (current.length < 2) return;
      const chosen = current[Math.floor(Math.random() * current.length)];
      setWinner(chosen);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
    }, PICK_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, winner]);

  const reset = () => {
    setWinner(null);
    setFingers([]);
    colorMapRef.current.clear();
  };

  const measureArena = () => {
    arenaRef.current?.measureInWindow((x, y) => {
      arenaOffset.current = { x, y };
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title={t('tools.firstPlayer')} />

      <View
        ref={arenaRef}
        style={styles.arena}
        onLayout={measureArena}
        onTouchStart={updateFingers}
        onTouchMove={updateFingers}
        onTouchEnd={updateFingers}
        onTouchCancel={updateFingers}
      >
        {/* İpucu metinleri */}
        {!winner && fingers.length === 0 && (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hintEmoji}>👆</Text>
            <Text style={styles.hint}>{t('tools.touchHint')}</Text>
          </View>
        )}
        {!winner && fingers.length === 1 && (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint}>{t('tools.touchMore')}</Text>
          </View>
        )}

        {/* Parmak altındaki dönen outline meeple'lar */}
        {!winner &&
          fingers.map((f) => (
            <View
              key={f.id}
              pointerEvents="none"
              style={[
                styles.meeple,
                {
                  left: f.x - MEEPLE_SIZE / 2,
                  top: f.y - MEEPLE_SIZE / 2,
                },
              ]}
            >
              <SpinningMeeple color={f.color} />
            </View>
          ))}

        {/* Kazanan: dolu renkli meeple + yazı */}
        {winner && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.meeple,
                {
                  left: winner.x - MEEPLE_SIZE / 2,
                  top: winner.y - MEEPLE_SIZE / 2,
                  transform: [{ scale: winScale }],
                },
              ]}
            >
              <Meeple color={winner.color} filled />
            </Animated.View>
            <View style={styles.winnerBanner} pointerEvents="box-none">
              <Text style={[styles.winnerText, { color: winner.color }]}>
                {t('tools.starts')}
              </Text>
              <Button
                label={t('tools.touchAgain')}
                onPress={reset}
                icon={<RotateCcw size={16} color={colors.white} />}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  arena: { flex: 1 },
  hintWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  hintEmoji: { fontSize: 44 },
  hint: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  meeple: { position: 'absolute' },
  winnerBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  winnerText: {
    fontFamily: fonts.display,
    fontSize: fontSize['3xl'],
    textAlign: 'center',
  },
});
