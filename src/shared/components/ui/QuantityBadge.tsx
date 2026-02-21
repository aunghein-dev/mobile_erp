import React, { memo, useMemo } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

type QuantityTone = "primary" | "success" | "warning" | "danger" | "accent" | "neutral";

type QuantityBadgeProps = {
  value: number | string;
  prefix?: string;
  suffix?: string;
  tone?: QuantityTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function QuantityBadgeComponent({
  value,
  prefix,
  suffix,
  tone = "primary",
  compact = false,
  style,
}: QuantityBadgeProps) {
  const theme = useTheme();
  const palette = useMemo(() => {
    if (tone === "success") return { color: theme.success, bg: `${theme.success}14`, border: `${theme.success}40` };
    if (tone === "warning") return { color: theme.warning, bg: `${theme.warning}14`, border: `${theme.warning}40` };
    if (tone === "danger") return { color: theme.danger, bg: `${theme.danger}14`, border: `${theme.danger}40` };
    if (tone === "accent") return { color: theme.accent, bg: `${theme.accent}14`, border: `${theme.accent}40` };
    if (tone === "neutral") return { color: theme.text, bg: theme.cardSoft, border: theme.border };
    return { color: theme.primary, bg: `${theme.primary}14`, border: `${theme.primary}40` };
  }, [theme, tone]);

  const displayValue = typeof value === "number" ? value.toLocaleString() : String(value);
  const hasPrefix = Boolean(prefix?.trim());
  const hasSuffix = Boolean(suffix?.trim());

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.wrapCompact : null,
        {
          borderColor: palette.border,
          backgroundColor: palette.bg,
        },
        style,
      ]}
      accessibilityRole="text"
    >
      <Text style={[styles.text, compact ? styles.textCompact : null, { color: palette.color }]}>
        {hasPrefix ? `${prefix} ` : ""}
        <Text style={[styles.value, compact ? styles.valueCompact : null, { color: palette.color }]}>
          {displayValue}
        </Text>
        {hasSuffix ? ` ${suffix}` : ""}
      </Text>
    </View>
  );
}

export const QuantityBadge = memo(QuantityBadgeComponent);

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  wrapCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
  textCompact: {
    fontSize: 9,
    lineHeight: 12,
  },
  value: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
  },
  valueCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
});
