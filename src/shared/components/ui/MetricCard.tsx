import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { useTheme } from "@/shared/contexts/ThemeContext";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: "blue" | "green" | "orange" | "rose" | "teal";
  icon?: React.ReactNode;
};

const toneMap = {
  blue: "#0B6CD8",
  green: "#0E8A43",
  orange: "#B67215",
  rose: "#C9363E",
  teal: "#0FA3B1",
};

function MetricCardComponent({ label, value, tone = "blue", icon }: MetricCardProps) {
  const theme = useTheme();
  const color = toneMap[tone];

  return (
    <Card
      style={[styles.card, { backgroundColor: "#FFFFFF" }]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: `${color}14` }]}>{icon}</View>
      </View>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
    </Card>
  );
}

export const MetricCard = memo(MetricCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
