import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Clock, Pencil, Trash2 } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  deleteSheet,
  listSheets,
  type SheetSummary,
} from '@/lib/db/repository';
import { sync } from '@/lib/db/sync';
import { setSheetDraft } from '@/lib/draft';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    // Arka planda senkron dene (başarısız olsa da yerelden göster).
    sync(userId).catch(() => {});
    const rows = await listSheets(userId);
    setSheets(rows);
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickAndCreate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setSheetDraft({ imageUri: result.assets[0].uri, name: '' });
    router.push('/sheet/new');
  };

  const onDelete = async (id: string) => {
    await deleteSheet(id);
    if (userId) {
      sync(userId).catch(() => {});
      setSheets(await listSheets(userId));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.tagline}>{t('sheets.tagline')}</Text>
        <Text style={styles.title}>{t('sheets.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
        ) : (
          <>
            {sheets.length === 0 && (
              <Text style={styles.empty}>{t('sheets.empty')}</Text>
            )}

            {sheets.map((s) => (
              <View key={s.id} style={styles.card}>
                <Pressable
                  style={styles.thumb}
                  onPress={() => router.push(`/sheet/${s.id}`)}
                >
                  {s.image_path ? (
                    <Image
                      source={{ uri: s.image_path }}
                      style={styles.thumbImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbEmpty} />
                  )}
                </Pressable>

                <View style={styles.cardBody}>
                  <View>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {s.name || t('sheets.untitled')}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {t('sheets.meta', {
                        rows: s.rowCount,
                        sessions: s.sessionCount,
                      })}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.primaryChip}
                      onPress={() => router.push(`/play/${s.id}`)}
                    >
                      <Pencil size={13} color={colors.surface} />
                      <Text style={styles.primaryChipText}>
                        {t('sheets.newGame')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.ghostChip}
                      onPress={() => router.push(`/history/${s.id}`)}
                    >
                      <Clock size={13} color={colors.inkSoft} />
                      <Text style={styles.ghostChipText}>
                        {t('sheets.history')}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => onDelete(s.id)}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={colors.inkSoft} />
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addBtn} onPress={pickAndCreate}>
              <Camera size={18} color={colors.ink} />
              <Text style={styles.addBtnText}>{t('sheets.newSheet')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xs },
  tagline: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    marginTop: 2,
  },
  list: { padding: spacing.md, paddingBottom: 40 },
  empty: {
    textAlign: 'center',
    color: colors.inkSoft,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  thumb: {
    width: 60,
    height: 78,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmpty: { flex: 1, backgroundColor: colors.line },
  cardBody: { flex: 1, justifyContent: 'space-between' },
  cardName: { fontFamily: fonts.display, fontSize: fontSize.md, color: colors.ink },
  cardMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    marginTop: 2,
  },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  primaryChipText: {
    color: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
  },
  ghostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghostChipText: {
    color: colors.inkSoft,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
  },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', width: 32 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  addBtnText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSize.base },
});
