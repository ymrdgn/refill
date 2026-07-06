/**
 * ui.tsx — ortak UI bileşenleri.
 *
 * Tüm ekranlar üst barı ve butonları buradan kullanır; ekran başına
 * kopyalanan stiller yerine tek bir tasarım dili.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts, fontSize, radius, shadow, spacing } from '@/lib/theme';

/* ------------------------------------------------------------------ */
/*  TopBar — geri + başlık + opsiyonel sağ aksiyon                     */
/* ------------------------------------------------------------------ */
export function TopBar({
  title,
  back = true,
  action,
}: {
  title: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={ui.topbar}>
      {back && (
        <Pressable
          style={({ pressed }) => [ui.iconBtn, pressed && ui.pressedSoft]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
      )}
      <Text style={ui.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {action}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Button — primary (pine dolgulu) / ghost (çerçeveli)                */
/* ------------------------------------------------------------------ */
export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      style={({ pressed }) => [
        ui.btn,
        isPrimary ? ui.btnPrimary : ui.btnGhost,
        (disabled || loading) && ui.btnDisabled,
        pressed && !disabled && !loading && ui.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.ink} />
      ) : (
        <>
          {icon}
          <Text
            style={[ui.btnText, { color: isPrimary ? colors.white : colors.ink }]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Card — yüzey + ince çerçeve + yumuşak gölge                        */
/* ------------------------------------------------------------------ */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[ui.card, style]}>{children}</View>;
}

const ui = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  topTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  btnPrimary: { backgroundColor: colors.ink, ...shadow.primary },
  btnGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semibold, fontSize: fontSize.md },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  pressedSoft: { opacity: 0.7 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    ...shadow.card,
  },
});
