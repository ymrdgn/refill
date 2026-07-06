import { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { TopBar } from '@/components/ui';
import { getSessionDetail, getSheet, type SessionDetail } from '@/lib/db/repository';
import InkLayer, { type InkStroke } from '@/components/InkLayer';
import BlankPaper from '@/components/BlankPaper';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [aspect, setAspect] = useState(0.75);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    (async () => {
      if (!id) return;
      const d = await getSessionDetail(id);
      setDetail(d);
      if (d) {
        const sheet = await getSheet(d.session.sheet_id);
        setImageUri(sheet?.image_path ?? null);
        if (sheet?.image_path) {
          Image.getSize(
            sheet.image_path,
            (w, h) => setAspect(w / h),
            () => setAspect(0.75)
          );
        }
      }
    })();
  }, [id]);

  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const strokes: InkStroke[] =
    detail?.strokes.map((s) => ({ rowId: s.row_id, points: s.points })) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title={detail?.session.name || ''} />

      <ScrollView contentContainerStyle={styles.body}>
        {detail && (
          <Text style={styles.date}>{fmt(detail.session.played_at)}</Text>
        )}

        <View style={styles.canvas} onLayout={onLayout}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', aspectRatio: aspect }}
              resizeMode="cover"
            />
          ) : (
            <BlankPaper />
          )}
          <InkLayer strokes={strokes} width={size.w} height={size.h} />
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  date: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    paddingBottom: 10,
  },
  canvas: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
