import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pencil, Undo2 } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';
import { TopBar } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getSheet, getSheetRows, saveSession } from '@/lib/db/repository';
import { sync } from '@/lib/db/sync';
import InkLayer, { type InkStroke } from '@/components/InkLayer';
import type { Sheet, SheetRow, StrokePoint } from '@/lib/database.types';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export default function PlayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { sheetId } = useLocalSearchParams<{ sheetId: string }>();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [aspect, setAspect] = useState(0.75);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [gameName, setGameName] = useState('');
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [live, setLive] = useState<StrokePoint[] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const liveRef = useRef<StrokePoint[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!sheetId) return;
      const s = await getSheet(sheetId);
      const r = await getSheetRows(sheetId);
      setSheet(s);
      setRows(r);
      if (s?.image_path) {
        Image.getSize(
          s.image_path,
          (w, h) => setAspect(w / h),
          () => setAspect(0.75)
        );
      }
    })();
  }, [sheetId]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const pt = (e: GestureResponderEvent): StrokePoint => ({
    x: clamp01(size.w ? e.nativeEvent.locationX / size.w : 0),
    y: clamp01(size.h ? e.nativeEvent.locationY / size.h : 0),
    t: Date.now(),
  });

  const nearestRow = (cy: number): string | null => {
    let best: string | null = null;
    let bd = Infinity;
    for (const r of rows) {
      const d = Math.abs(r.y - cy);
      if (d < bd) {
        bd = d;
        best = r.id;
      }
    }
    return best;
  };

  const start = (e: GestureResponderEvent) => {
    setDrawing(true);
    liveRef.current = [pt(e)];
    setLive([...liveRef.current]);
  };
  const move = (e: GestureResponderEvent) => {
    if (!liveRef.current) return;
    liveRef.current.push(pt(e));
    setLive([...liveRef.current]);
  };
  const finish = () => {
    setDrawing(false);
    const p = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (p && p.length > 1) {
      const cy = p.reduce((a, q) => a + q.y, 0) / p.length;
      const rowId = nearestRow(cy);
      setStrokes((prev) => [...prev, { rowId, points: p }]);
      setHighlight(rowId);
    }
  };

  const undo = () => setStrokes((prev) => prev.slice(0, -1));

  const save = async () => {
    if (!userId || !sheet) return;
    await saveSession({
      sheetId: sheet.id,
      userId,
      name: gameName,
      values: {},
      strokes: strokes.map((s) => ({ rowId: s.rowId, points: s.points })),
    });
    sync(userId).catch(() => {});
    router.replace(`/history/${sheet.id}`);
  };

  const highlightY =
    highlight != null ? rows.find((r) => r.id === highlight)?.y ?? null : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar
        title={sheet?.name || ''}
        action={
          <Pressable
            style={({ pressed }) => [
              styles.undoBtn,
              !strokes.length && styles.undoDisabled,
              pressed && strokes.length > 0 && styles.pressed,
            ]}
            onPress={undo}
            disabled={!strokes.length}
          >
            <Undo2 size={15} color={strokes.length ? colors.ink : colors.inkSoft} />
            <Text
              style={[
                styles.undoText,
                { color: strokes.length ? colors.ink : colors.inkSoft },
              ]}
            >
              {t('play.undo')}
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.body}
        scrollEnabled={!drawing}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.nameInput}
          value={gameName}
          onChangeText={setGameName}
          placeholder={t('play.namePlaceholder')}
          placeholderTextColor={colors.inkSoft}
        />

        <View style={styles.writeHint}>
          <Pencil size={13} color={colors.inkSoft} />
          <Text style={styles.writeHintText}>{t('play.writeHint')}</Text>
        </View>

        {sheet?.image_path ? (
          <View style={styles.canvas} onLayout={onLayout}>
            <Image
              source={{ uri: sheet.image_path }}
              style={{ width: '100%', aspectRatio: aspect }}
              resizeMode="cover"
            />
            <InkLayer
              strokes={strokes}
              current={live}
              width={size.w}
              height={size.h}
              highlightY={highlightY}
            />
            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onStartShouldSetResponderCapture={() => true}
              onMoveShouldSetResponder={() => true}
              onMoveShouldSetResponderCapture={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={start}
              onResponderMove={move}
              onResponderRelease={finish}
              onResponderTerminate={finish}
            />
          </View>
        ) : null}

        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>{t('play.save')}</Text>
        </Pressable>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  undoDisabled: { opacity: 0.6 },
  undoText: { fontFamily: fonts.semibold, fontSize: fontSize.sm },
  body: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  nameInput: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
  },
  writeHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  writeHintText: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.inkSoft },
  canvas: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    marginTop: spacing.lg,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    ...shadow.primary,
  },
  saveBtnText: { color: colors.white, fontFamily: fonts.display, fontSize: fontSize.md },
});
