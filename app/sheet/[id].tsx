import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { TopBar } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getSheet, getSheetRows, saveSheet } from '@/lib/db/repository';
import { sync } from '@/lib/db/sync';
import { getSheetDraft, clearSheetDraft } from '@/lib/draft';
import { uuid } from '@/lib/uuid';

interface RowDraft {
  id: string;
  y: number;
  label: string;
}

export default function SheetSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [imgHeight, setImgHeight] = useState(0);
  const [aspect, setAspect] = useState(0.75); // w/h fallback

  // Yükleme: yeni ise draft'tan, değilse repo'dan
  useEffect(() => {
    (async () => {
      if (isNew) {
        const d = getSheetDraft();
        setImageUri(d?.imageUri ?? null);
        setName(d?.name ?? '');
        setRows([]);
      } else if (id) {
        const sheet = await getSheet(id);
        const existing = await getSheetRows(id);
        setImageUri(sheet?.image_path ?? null);
        setName(sheet?.name ?? '');
        setRows(existing.map((r) => ({ id: r.id, y: r.y, label: r.label })));
      }
    })();
  }, [id, isNew]);

  // Görselin en-boy oranını al (yükseklik hesaplamak için)
  useEffect(() => {
    if (!imageUri) return;
    Image.getSize(
      imageUri,
      (w, h) => setAspect(w / h),
      () => setAspect(0.75)
    );
  }, [imageUri]);

  // Foto'ya dokun: yakın bir çizgi varsa onu kaldır (toggle), yoksa yeni satır ekle.
  const TAP_THRESHOLD = 0.025; // ekran yüksekliğinin ~%2.5'i
  const addRow = useCallback(
    (e: GestureResponderEvent) => {
      if (!imgHeight) return;
      const y = Math.min(1, Math.max(0, e.nativeEvent.locationY / imgHeight));
      setRows((prev) => {
        let nearest: RowDraft | null = null;
        let nd = Infinity;
        for (const r of prev) {
          const d = Math.abs(r.y - y);
          if (d < nd) {
            nd = d;
            nearest = r;
          }
        }
        if (nearest && nd <= TAP_THRESHOLD) {
          return prev.filter((r) => r.id !== nearest!.id);
        }
        return [...prev, { id: uuid(), y, label: '' }].sort((a, b) => a.y - b.y);
      });
    },
    [imgHeight]
  );

  const save = async () => {
    if (!userId) return;
    await saveSheet({
      id: isNew ? undefined : id,
      userId,
      name,
      imagePath: imageUri,
      rows: rows.map((r) => ({ id: r.id, y: r.y, label: r.label })),
    });
    clearSheetDraft();
    sync(userId).catch(() => {});
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar
        title={t('setup.title')}
        action={
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
            onPress={save}
          >
            <Text style={styles.saveBtnText}>{t('setup.save')}</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.hint}>{t('setup.hint')}</Text>

        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder={t('setup.namePlaceholder')}
          placeholderTextColor={colors.inkSoft}
        />

        {imageUri ? (
          <Pressable
            style={styles.imageWrap}
            onPress={addRow}
            onLayout={(e) => setImgHeight(e.nativeEvent.layout.height)}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', aspectRatio: aspect }}
              resizeMode="cover"
            />
            {rows.map((r) => (
              <View
                key={r.id}
                style={[styles.rowLine, { top: `${r.y * 100}%` }]}
              />
            ))}
          </Pressable>
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>{t('setup.needImage')}</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  saveBtnText: {
    color: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: fontSize.base,
  },
  body: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  hint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
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
  imageWrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 2,
    borderTopColor: colors.accent,
    borderStyle: 'dashed',
  },
  noImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: { color: colors.inkSoft, fontFamily: fonts.regular, fontSize: fontSize.sm },
});
