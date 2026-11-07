import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { niceTicks } from '@/lib/chartScale';
import { spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type LinePoint = { x: number; y: number };

type LineChartProps = {
  // At least two points, oldest first, already in the units to show.
  points: LinePoint[];
  formatX: (x: number) => string;
  // A short axis label, such as "80" or "1:10".
  formatTick: (y: number) => string;
  // A value in full, with its unit, such as "82.5 kg" or "1:20".
  formatValue: (y: number) => string;
  // Read out in place of the drawing, for example "Est. 1RM over 3 months".
  accessibilityLabel: string;
  height?: number;
};

const padding = { top: 12, right: 12, bottom: 24, left: 44 };
const fontSize = 12;

// A single-series line chart drawn from the theme: a 2px line, 8px points
// with a ring in the surface colour, hairline gridlines and muted axis text.
// The latest point is labelled; touching the chart shows the nearest point's
// value above it, so every value can be read without a label on each point.
export function LineChart({
  points,
  formatX,
  formatTick,
  formatValue,
  accessibilityLabel,
  height = 200,
}: LineChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const ticks = niceTicks(
    Math.min(...points.map((point) => point.y)),
    Math.max(...points.map((point) => point.y)),
  );
  const yMin = ticks[0] ?? 0;
  const yMax = ticks[ticks.length - 1] ?? 1;
  const xMin = points[0]?.x ?? 0;
  const xMax = points[points.length - 1]?.x ?? 1;
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;

  const toX = (x: number) => padding.left + ((x - xMin) / (xMax - xMin || 1)) * plotWidth;
  const toY = (y: number) => padding.top + (1 - (y - yMin) / (yMax - yMin || 1)) * plotHeight;

  const shownIndex = selected ?? points.length - 1;
  const shown = points[shownIndex];
  const last = points[points.length - 1];

  function selectAt(touchX: number) {
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(toX(point.x) - touchX) < Math.abs(toX(points[nearest]?.x ?? 0) - touchX)) {
        nearest = index;
      }
    });
    setSelected(nearest);
  }

  return (
    <View>
      <Text
        variant="secondary"
        tone="textMuted"
        accessibilityLiveRegion="polite"
        style={styles.readout}
      >
        {shown
          ? `${selected === null ? 'Latest, ' : ''}${formatX(shown.x)}: ${formatValue(shown.y)}`
          : ''}
      </Text>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(event) => selectAt(event.nativeEvent.locationX)}
        onResponderMove={(event) => selectAt(event.nativeEvent.locationX)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((tick) => (
              <Line
                key={`grid-${tick}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={toY(tick)}
                y2={toY(tick)}
                stroke={colors.separator}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            ))}
            {ticks.map((tick) => (
              <SvgText
                key={`tick-${tick}`}
                x={padding.left - spacing.sm}
                y={toY(tick) + fontSize / 3}
                fontSize={fontSize}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {formatTick(tick)}
              </SvgText>
            ))}
            <SvgText
              x={padding.left}
              y={height - spacing.xs}
              fontSize={fontSize}
              fill={colors.textMuted}
              textAnchor="start"
            >
              {formatX(xMin)}
            </SvgText>
            <SvgText
              x={width - padding.right}
              y={height - spacing.xs}
              fontSize={fontSize}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {formatX(xMax)}
            </SvgText>
            {selected !== null && shown ? (
              <Line
                x1={toX(shown.x)}
                x2={toX(shown.x)}
                y1={padding.top}
                y2={padding.top + plotHeight}
                stroke={colors.border}
                strokeWidth={1}
              />
            ) : null}
            <Polyline
              points={points.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ')}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point, index) => (
              <Circle
                key={`${point.x}-${index}`}
                cx={toX(point.x)}
                cy={toY(point.y)}
                r={index === shownIndex ? 5 : 4}
                fill={colors.accent}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
            {last ? (
              <SvgText
                x={Math.min(toX(last.x), width - padding.right)}
                y={toY(last.y) - spacing.md}
                fontSize={fontSize}
                fontWeight="600"
                fill={colors.text}
                textAnchor="end"
              >
                {formatValue(last.y)}
              </SvgText>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { minHeight: 20 },
});
