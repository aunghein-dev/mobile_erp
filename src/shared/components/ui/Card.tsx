import React, { memo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function CardComponent({ children, style }: CardProps) {
  const theme = useTheme();
  return (
    <View
      accessible={false}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: "#06223B",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const Card = memo(CardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
});
