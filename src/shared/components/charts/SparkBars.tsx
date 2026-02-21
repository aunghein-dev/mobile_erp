import React, { memo, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useTheme } from "@/shared/contexts/ThemeContext";

type SparkBarsProps = {
  values: number[];
  labels?: string[];
};

type Point = {
  x: number;
  y: number;
  value: number;
};

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAxis(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function resolveLabels(length: number, provided?: string[]) {
  if (provided?.length === length) return provided;
  if (length === 7) return WEEK_LABELS;
  if (length === 12) return MONTH_LABELS;
  return Array.from({ length }, (_, index) => `P${index + 1}`);
}

function SparkBarsComponent({ values, labels }: SparkBarsProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const normalizedValues = useMemo(() => {
    const numeric = values.map(toSafeNumber);
    const sliced = numeric.slice(-12);
    return sliced.length ? sliced : [0];
  }, [values]);

  const chartLabels = useMemo(
    () => resolveLabels(normalizedValues.length, labels?.slice(-normalizedValues.length)),
    [labels, normalizedValues.length]
  );

  const chartMetrics = useMemo(() => {
    const chartWidth = Math.max(width, 260);
    const chartHeight = 188;
    const left = 34;
    const right = 12;
    const top = 10;
    const bottom = 26;
    const plotWidth = Math.max(1, chartWidth - left - right);
    const plotHeight = Math.max(1, chartHeight - top - bottom);

    const maxValue = Math.max(...normalizedValues, 0);
    const yMax = maxValue > 0 ? maxValue * 1.08 : 1;
    const yMin = 0;
    const range = Math.max(1, yMax - yMin);

    const points: Point[] = normalizedValues.map((value, index) => {
      const x =
        normalizedValues.length === 1
          ? left + plotWidth / 2
          : left + (index / (normalizedValues.length - 1)) * plotWidth;
      const y = top + ((yMax - value) / range) * plotHeight;
      return { x, y, value };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");

    const baseY = top + plotHeight;
    const firstX = points[0]?.x ?? left;
    const lastX = points[points.length - 1]?.x ?? left + plotWidth;
    const areaPath = `${linePath} L ${lastX.toFixed(2)} ${baseY.toFixed(2)} L ${firstX.toFixed(2)} ${baseY.toFixed(2)} Z`;

    const yTicks = [yMax, yMax * 0.66, yMax * 0.33, 0];
    const yTickRows = yTicks.map((value) => {
      const y = top + ((yMax - value) / range) * plotHeight;
      return { value, y };
    });

    const xTickStep = points.length <= 7 ? 1 : 2;
    const xTicks = points
      .map((point, index) => ({
        x: point.x,
        label: chartLabels[index] ?? `P${index + 1}`,
        index,
      }))
      .filter((entry) => entry.index % xTickStep === 0 || entry.index === points.length - 1);

    return {
      chartWidth,
      chartHeight,
      left,
      right,
      top,
      bottom,
      plotWidth,
      points,
      linePath,
      areaPath,
      yTickRows,
      xTicks,
    };
  }, [chartLabels, normalizedValues, width]);

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== width) {
      setWidth(nextWidth);
    }
  };

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <Svg width="100%" height={chartMetrics.chartHeight}>
        <Defs>
          <LinearGradient id="salesTrendArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {chartMetrics.yTickRows.map((row, index) => (
          <Line
            key={`grid-${index}`}
            x1={chartMetrics.left}
            y1={row.y}
            x2={chartMetrics.left + chartMetrics.plotWidth}
            y2={row.y}
            stroke={theme.border}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
        ))}

        {chartMetrics.yTickRows.map((row, index) => (
          <SvgText
            key={`label-y-${index}`}
            x={chartMetrics.left - 4}
            y={row.y + 3}
            textAnchor="end"
            fill={theme.muted}
            fontSize={9}
            fontWeight="600"
          >
            {formatAxis(row.value)}
          </SvgText>
        ))}

        <Path d={chartMetrics.areaPath} fill="url(#salesTrendArea)" />
        <Path d={chartMetrics.linePath} stroke={theme.primary} strokeWidth={2.4} fill="none" />

        {chartMetrics.points.map((point, index) => (
          <Circle key={`point-${index}`} cx={point.x} cy={point.y} r={2.5} fill={theme.primary} />
        ))}

        {chartMetrics.xTicks.map((tick) => (
          <SvgText
            key={`label-x-${tick.index}`}
            x={tick.x}
            y={chartMetrics.chartHeight - 6}
            textAnchor="middle"
            fill={theme.muted}
            fontSize={9}
            fontWeight="600"
          >
            {tick.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export const SparkBars = memo(SparkBarsComponent);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minHeight: 188,
  },
});
