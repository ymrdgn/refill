/**
 * BlankPaper — fotoğrafsız kağıtlar için çizgili "boş kağıt" görünümü.
 *
 * Foto olmayan sheet'lerde (dart, okey vb. serbest skor tutma) Image yerine
 * bu çizilir; üstüne InkLayer ve satır işaretleri aynı şekilde biner.
 * En-boy oranı dikey A4'e yakın (3:4).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

export const BLANK_ASPECT = 3 / 4;

/** Yatay yardımcı çizgilerin y oranları (0..1). */
const LINES = Array.from({ length: 11 }, (_, i) => 0.14 + i * 0.075);

export default function BlankPaper({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.paper, style]}>
      {LINES.map((y) => (
        <View key={y} style={[styles.line, { top: `${y * 100}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: '100%',
    aspectRatio: BLANK_ASPECT,
    backgroundColor: colors.surface,
  },
  line: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    height: 1,
    backgroundColor: '#E6E2D6',
  },
});
