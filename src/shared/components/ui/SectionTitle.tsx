import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

function SectionTitleComponent({ title, right }: SectionTitleProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export const SectionTitle = memo(SectionTitleComponent);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
  },
  textWrap: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
});
