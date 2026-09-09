/**
 * Kağıt kurulumu — isim ver, önizle, kaydet.
 *
 * Satır işaretleme adımı kaldırıldı (2026-09-09): kullanıcı oyun sırasında
 * kağıdın TAMAMINA yazar, izler bir satıra bağlanmaz (strokes.row_id boş).
 * sheet_rows tablosu şemada duruyor; tanıma fazı gelirse satırlar otomatik
 * tespit ya da sonradan tanımlama ile eklenir. Eski kağıtların satırları
 * silinmez, olduğu gibi korunur.
 */
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { TopBar } from '@/components/ui';
import BlankPaper from '@/components/BlankPaper';
import { useAuth } from '@/hooks/useAuth';
import { getSheet, getSheetRows, saveSheet } from '@/lib/db/repository';
import { sync } from '@/lib/db/sync';
import { getSheetDraft, clearSheetDraft } from '@/lib/draft';
import { useSheetImage } from '@/hooks/useSheetImage';
import type { SheetRow } from '@/lib/database.types';

export default function SheetSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  /** Kaydedilecek değer: taslakta ham URI, mevcut kağıtta Storage yolu. */
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [name, setName] = useState('');
  /** Eski kağıtlardan kalan satırlar; düzenlemede olduğu gibi geri yazılır. */
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [aspect, setAspect] = useState(0.75); // w/h fallback

  /** Ekranda gösterilecek URI (yerel dosya ya da imzalı URL). */
  const imageUri = useSheetImage(id, imagePath);

  // Yükleme: yeni ise draft'tan, değilse repo'dan
  useEffect(() => {
    (async () => {
      if (isNew) {
        const d = getSheetDraft();
        setImagePath(d?.imageUri ?? null);
        setName(d?.name ?? '');
        setRows([]);
      } else if (id) {
        const sheet = await getSheet(id);
        setImagePath(sheet?.image_path ?? null);
        setName(sheet?.name ?? '');
        setRows(await getSheetRows(id));
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

  const save = async () => {
    if (!userId) return;
    await saveSheet({
      id: isNew ? undefined : id,
      userId,
      name,
      imagePath,
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

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>{t('setup.hint')}</Text>

        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder={t('setup.namePlaceholder')}
          placeholderTextColor={colors.inkSoft}
          autoFocus={isNew}
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', aspectRatio: aspect }}
              resizeMode="cover"
            />
          ) : (
            <BlankPaper />
          )}
        </View>

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
});
