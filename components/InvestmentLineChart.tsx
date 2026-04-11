import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

type ChartItem = {
  value: number;
  label?: string;
};

type Props = {
  data: ChartItem[];
  height?: number;
};

export function InvestmentLineChart({ data, height = 180 }: Props) {
  const [width, setWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  const points = useMemo(() => {
    if (!width || data.length === 0) return [];

    const paddingLeft = 16;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 24;

    const values = data.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);

    return data.map((item, index) => {
      const x =
        data.length === 1
          ? width / 2
          : paddingLeft +
            (index * (width - paddingLeft - paddingRight)) / (data.length - 1);

      const y =
        paddingTop +
        ((max - item.value) / range) * (height - paddingTop - paddingBottom);

      return {
        x,
        y,
        label: item.label ?? '',
      };
    });
  }, [data, height, width]);

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      {width > 0 && data.length > 0 ? (
        <>
          <Svg width={width} height={height}>
            <Line
              x1={16}
              y1={height - 24}
              x2={width - 16}
              y2={height - 24}
              stroke={colors.border}
              strokeWidth={1}
            />

            {points.length >= 2 && (
              <Path
                d={path}
                fill="none"
                stroke={colors.keep}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {points.length === 1 && (
              <Line
                x1={16}
                y1={points[0].y}
                x2={width - 16}
                y2={points[0].y}
                stroke={colors.keep}
                strokeWidth={3}
                strokeLinecap="round"
              />
            )}

            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={colors.keep}
              />
            ))}
          </Svg>

          <View style={styles.labelsRow}>
            {data.map((item, index) => (
              <Text
                key={`${item.label}-${index}`}
                style={[
                  styles.label,
                  index === 0 && styles.leftLabel,
                  index === data.length - 1 && styles.rightLabel,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.empty, { height }]} />
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
  labelsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  leftLabel: {
    textAlign: 'left',
  },
  rightLabel: {
    textAlign: 'right',
  },
});