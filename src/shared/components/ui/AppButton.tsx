import React, { memo, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type AppButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  loading?: boolean;
  variant?: Variant;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function AppButtonComponent({
  label,
  loading = false,
  variant = "primary",
  leftIcon,
  disabled,
  style,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: AppButtonProps) {
  const theme = useTheme();
  const blocked = Boolean(disabled || loading);

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      textColor: "#FFFFFF",
    },
    secondary: {
      backgroundColor: theme.cardSoft,
      borderColor: theme.border,
      textColor: theme.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: theme.border,
      textColor: theme.text,
    },
    danger: {
      backgroundColor: theme.danger,
      borderColor: theme.danger,
      textColor: "#FFFFFF",
    },
  }[variant];

  const accessibilityState = useMemo(
    () => ({ disabled: blocked, busy: loading || undefined }),
    [blocked, loading]
  );

  return (
    <Pressable
      disabled={blocked}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      android_ripple={{ color: `${variantStyles.textColor}20` }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: blocked ? 0.6 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text style={[styles.label, { color: variantStyles.textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const AppButton = memo(AppButtonComponent);

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
