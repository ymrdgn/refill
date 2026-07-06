import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  deleteSession,
  getSheet,
  listSessionSummaries,
  type SessionSummary,
} from '@/lib/db/repository';
import { sync } from '@/lib/db/sync';

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { sheetId } = useLocalSearchParams<{ sheetId: string }>();

  const [title, setTitle] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const load = useCallback(async () => {
    if (!sheetId) return;
    const [sheet, list] = await Promise.all([
      getSheet(sheetId),
      listSessionSummaries(sheetId),
    ]);
    setTitle(sheet?.name || '');
    setSessions(list);
  }, [sheetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const onDelete = async (id: string) => {
    await deleteSession(id);
    if (userId) sync(userId).catch(() => {});
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {title} · {t('history.title')}
        </Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push(`/play/${sheetId}`)}
        >
          <Plus size={16} color={colors.surface} />
          <Text style={styles.newBtnText}>{t('history.newGame')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {sessions.length === 0 && (
          <Text style={styles.empty}>{t('history.empty')}</Text>
        )}
        {sessions.map((s) => (
          <View key={s.id} style={styles.card}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push(`/session/${s.id}`)}
            >
              <Text style={styles.name} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.meta}>
                {fmt(s.played_at)} · {t('history.strokeCount', { n: s.strokeCount })}
              </Text>
            </Pressable>
            <Pressable style={styles.del} onPress={() => onDelete(s.id)} hitSlop={8}>
              <Trash2 size={16} color={colors.inkSoft} />
            </Pressable>
          </View>
        ))}
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  newBtnText: { color: colors.surface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  list: { padding: spacing.md, paddingBottom: 40 },
  empty: {
    textAlign: 'center',
    color: colors.inkSoft,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  name: { fontFamily: fonts.display, fontSize: fontSize.base, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.inkSoft, marginTop: 2 },
  del: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
