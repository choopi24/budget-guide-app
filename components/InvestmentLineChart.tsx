import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Line } from 'react-native-svg';
import type { SupportedCurrency } from '../db/settings';
import { formatCompactMoney } from '../lib/money';
import { colors } from '../theme/colors';
import { springEasing } from '../theme/tokens';

type ChartItem = {
  value: number;
  label?: string;
};

type Props = {
  data: ChartItem[];
  height?: number;
  currency?: SupportedCurrency;
};

const PAD_LEFT   = 52;
const PAD_RIGHT  = 12;
const PAD_TOP    = 20;
const PAD_BOTTOM = 36;

// ── Catmull-Rom → cubic bezier smooth path ───────────────────────────────────
// Produces a smooth curve through all data points without overshooting.
function buildSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  const alpha = 0.18; // tension — lower = tighter curves
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * alpha;
    const cp1y = p1.y + (p2.y - p0.y) * alpha;
    const cp2x = p2.x - (p3.x - p1.x) * alpha;
    const cp2y = p2.y - (p3.y - p1.y) * alpha;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvestmentLineChart({ data, height = 200, currency = 'ILS' }: Props) {
  const [width, setWidth] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (data.length > 0 && width > 0) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: springEasing }).start();
    }
  }, [data.length, width]);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  const { points, minVal, maxVal } = useMemo(() => {
    if (!width || data.length === 0) return { points: [], minVal: 0, maxVal: 0 };

    const values   = data.map((item) => item.value);
    const rawMin   = Math.min(...values);
    const rawMax   = Math.max(...values);
    const pad      = Math.max(rawMax - rawMin, 1) * 0.10;
    const minVal   = rawMin - pad;
    const maxVal   = rawMax + pad;
    const range    = maxVal - minVal;

    const pts = data.map((item, index) => {
      const x =
        data.length === 1
          ? PAD_LEFT + (width - PAD_LEFT - PAD_RIGHT) / 2
          : PAD_LEFT + (index * (width - PAD_LEFT - PAD_RIGHT)) / (data.length - 1);

      const y = PAD_TOP + ((maxVal - item.value) / range) * (height - PAD_TOP - PAD_BOTTOM);

      return { x, y, label: item.label ?? '', value: item.value };
    });

    return { points: pts, minVal, maxVal };
  }, [data, height, width]);

  const smoothLine = useMemo(() => buildSmoothPath(points), [points]);

  // Area fill: same control points as line, closed to baseline
  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const baseline = (height - PAD_BOTTOM).toFixed(1);
    return `${smoothLine} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;
  }, [smoothLine, points, height]);

  // Only the mid-axis gridline — reduces visual noise
  const midY = useMemo(() => {
    if (!width) return null;
    return PAD_TOP + (height - PAD_TOP - PAD_BOTTOM) / 2;
  }, [width, height]);

  const midLabel = useMemo(
    () => formatCompactMoney(Math.round(((minVal + maxVal) / 2) * 100), currency),
    [minVal, maxVal, currency],
  );
  const topLabel = useMemo(
    () => formatCompactMoney(Math.round(maxVal * 100), currency),
    [maxVal, currency],
  );
  const bottomLabel = useMemo(
    () => formatCompactMoney(Math.round(minVal * 100), currency),
    [minVal, currency],
  );

  // X-axis labels: at most 4, evenly spaced
  const xLabels = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) return [points[0]];
    const step = Math.max(1, Math.floor((points.length - 1) / 3));
    const indices = new Set<number>();
    for (let i = 0; i < points.length; i += step) indices.add(i);
    indices.add(points.length - 1);
    return Array.from(indices).map((i) => points[i]);
  }, [points]);

  const isPositive = data.length >= 2
    ? data[data.length - 1].value >= data[0].value
    : true;
  const lineColor = isPositive ? colors.primary : colors.danger;

  const lastPoint = points[points.length - 1];

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      {width > 0 && data.length > 0 ? (
        <Animated.View style={{ opacity: fadeAnim }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={lineColor} stopOpacity={0.16} />
              <Stop offset="100%" stopColor={lineColor} stopOpacity={0}    />
            </LinearGradient>
          </Defs>

          {/* Single mid-axis grid line — minimal, not distracting */}
          {midY !== null && (
            <Line
              x1={PAD_LEFT}
              y1={midY}
              x2={width - PAD_RIGHT}
              y2={midY}
              stroke={colors.border}
              strokeWidth={StyleSheet.hairlineWidth}
              strokeDasharray="3 4"
            />
          )}

          {/* Area fill */}
          {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

          {/* Smooth line */}
          {points.length >= 2 && (
            <Path
              d={smoothLine}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Single-point: horizontal rule */}
          {points.length === 1 && (
            <Line
              x1={PAD_LEFT}    y1={points[0].y}
              x2={width - PAD_RIGHT} y2={points[0].y}
              stroke={lineColor} strokeWidth={2.5} strokeLinecap="round"
            />
          )}

          {/* Endpoint dot — outer glow ring + white fill + border */}
          {lastPoint && (
            <>
              <Circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={9}
                fill={lineColor}
                opacity={0.12}
              />
              <Circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={5}
                fill={colors.surface}
                stroke={lineColor}
                strokeWidth={2.5}
              />
            </>
          )}
        </Svg>
        </Animated.View>
      ) : (
        <View style={[styles.empty, { height }]} />
      )}

      {/* X-axis labels */}
      {xLabels.length > 0 && (
        <View style={[styles.xAxisRow, { marginLeft: PAD_LEFT, marginRight: PAD_RIGHT }]}>
          {xLabels.map((pt, i) => (
            <Text
              key={i}
              style={[
                styles.xLabel,
                i === 0 && styles.xLabelLeft,
                i === xLabels.length - 1 && styles.xLabelRight,
              ]}
              numberOfLines={1}
            >
              {pt.label}
            </Text>
          ))}
        </View>
      )}

      {/* Y-axis labels: top / mid / bottom */}
      {width > 0 && (
        <View style={[StyleSheet.absoluteFillObject, styles.yAxisOverlay]}>
          <Text style={[styles.yLabel, { top: PAD_TOP - 8 }]}         numberOfLines={1}>{topLabel}</Text>
          {midY !== null && (
            <Text style={[styles.yLabel, { top: midY - 8 }]}          numberOfLines={1}>{midLabel}</Text>
          )}
          <Text style={[styles.yLabel, { top: height - PAD_BOTTOM - 8 }]} numberOfLines={1}>{bottomLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  empty: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    flex: 1,
  },
  xLabelLeft:  { textAlign: 'left' },
  xLabelRight: { textAlign: 'right' },
  yAxisOverlay: { pointerEvents: 'none' },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: PAD_LEFT - 4,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
