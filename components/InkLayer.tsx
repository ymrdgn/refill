/**
 * InkLayer — oran tabanlı kalem izlerini (0..1) foto üstüne çizer.
 *
 * Piksel eşlemeli (width/height verilir): preserveAspectRatio bozulması yok,
 * çizgi kalınlığı sabit. Hem play (canlı) hem session (salt-okunur) kullanır.
 */
import Svg, { Polyline } from 'react-native-svg';
import type { StrokePoint } from '@/lib/database.types';
import { colors } from '@/lib/theme';

export interface InkStroke {
  /** Şemada duruyor ama artık hep boş: kağıdın tamamı yazı alanıdır. */
  rowId: string | null;
  points: StrokePoint[];
}

interface Props {
  strokes: InkStroke[];
  current?: StrokePoint[] | null;
  width: number;
  height: number;
}

function toPoints(pts: StrokePoint[], w: number, h: number): string {
  return pts.map((p) => `${(p.x * w).toFixed(1)},${(p.y * h).toFixed(1)}`).join(' ');
}

export default function InkLayer({
  strokes,
  current,
  width,
  height,
}: Props) {
  if (!width || !height) return null;
  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      {strokes.map((s, i) =>
        s.points.length > 1 ? (
          <Polyline
            key={i}
            points={toPoints(s.points, width, height)}
            fill="none"
            stroke={colors.pen}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null
      )}
      {current && current.length > 1 && (
        <Polyline
          points={toPoints(current, width, height)}
          fill="none"
          stroke={colors.pen}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
