import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { SupportedCurrency } from '../db/settings';
import { formatCompactMoney } from '../lib/money';
import { colors } from '../theme/colors';

type ChartItem = {
  value: number;
  label?: string;
};

type Props = {
  data: ChartItem[];
  height?: number;
  currency?: SupportedCurrency;
};

const PAD_LEFT = 56;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

export function InvestmentLineChart({ data, height = 200, currency = 'ILS' }: Props) {
  const [width, setWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  const { points, minVal, maxVal } = useMemo(() => {
    if (!width || data.length === 0) return { points: [], minVal: 0, maxVal: 0 };

    const values = data.map((item) => item.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max(rawMax - rawMin, 1) * 0.08;
    const minVal = rawMin - pad;
    const maxVal = rawMax + pad;
    const displayRange = maxVal - minVal;

    const pts = data.map((item, index) => {
      const x =
        data.length === 1
          ? PAD_LEFT + (width - PAD_LEFT - PAD_RIGHT) / 2
          : PAD_LEFT +
            (index * (width - PAD_LEFT - PAD_RIGHT)) / (data.length - 1);

      const y =
        PAD_TOP +
        ((maxVal - item.value) / displayRange) * (height - PAD_TOP - PAD_BOTTOM);

      return { x, y, label: item.label ?? '', value: item.value };
    });

    return { points: pts, minVal, maxVal };
  }, [data, height, width]);

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Area fill path (close back to baseline)
  const areaPath =
    points.length >= 2
      ? `${path} L ${points[points.length - 1].x.toFixed(1)} ${(height - PAD_BOTTOM).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - PAD_BOTTOM).toFixed(1)} Z`
      : '';

  // Y-axis ticks: top, mid, bottom
  const yTicks = useMemo(() => {
    if (!width) return [];
    const midVal = (minVal + maxVal) / 2;
    return [
      { value: maxVal, y: PAD_TOP },
      { value: midVal, y: PAD_TOP + (height - PAD_TOP - PAD_BOTTOM) / 2 },
      { value: minVal, y: height - PAD_BOTTOM },
    ].map((t) => ({
      ...t,
      label: formatCompactMoney(Math.round(t.value * 100), currency),
    }));
  }, [minVal, maxVal, height, width, currency]);

  // X-axis labels: show at most 4 evenly spaced points
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

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      {width > 0 && data.length > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Horizontal grid lines at each Y tick */}
          {yTicks.map((tick) => (
            <Line
              key={`grid-${tick.y}`}
              x1={PAD_LEFT}
              y1={tick.y}
              x2={width - PAD_RIGHT}
              y2={tick.y}
              stroke={colors.border}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}

          {/* Area fill */}
          {areaPath ? (
            <Path d={areaPath} fill="url(#areaGrad)" />
          ) : null}

          {/* Line */}
          {points.length >= 2 && (
            <Path
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.length === 1 && (
            <Line
              x1={PAD_LEFT}
              y1={points[0].y}
              x2={width - PAD_RIGHT}
              y2={points[0].y}
              stroke={lineColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}

          {/* Data point dots — only last point */}
          {points.length > 0 && (
            <>
              <Circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r={5}
                fill={colors.surface}
                stroke={lineColor}
                strokeWidth={2}
              />
            </>
          )}
        </Svg>
      ) : (
        <View style={[styles.empty, { height }]} />
      )}

      {/* X-axis labels (dates) */}
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

      {/* Y-axis labels (values) - rendered outside SVG for easier text control */}
      {yTicks.length > 0 && width > 0 && (
        <View style={[StyleSheet.absoluteFillObject, styles.yAxisOverlay]}>
          {yTicks.map((tick, i) => (
            <Text
              key={i}
              style={[styles.yLabel, { top: tick.y - 8 }]}
              numberOfLines={1}
            >
              {tick.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
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
  xLabelLeft: { textAlign: 'left' },
  xLabelRight: { textAlign: 'right' },
  yAxisOverlay: {
    pointerEvents: 'none',
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: PAD_LEFT - 4,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
