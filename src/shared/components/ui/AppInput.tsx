import React, { memo, useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

type AppInputProps = Omit<TextInputProps, "style"> & {
  label?: string;
  error?: string;
  helperText?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

function AppInputComponent({
  label,
  error,
  helperText,
  style,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
  editable = true,
  ...props
}: AppInputProps) {
  const theme = useTheme();
  const resolvedAccessibilityLabel = useMemo(
    () => accessibilityLabel || label || props.placeholder || "Input field",
    [accessibilityLabel, label, props.placeholder]
  );
  const resolvedAccessibilityHint = useMemo(() => {
    if (accessibilityHint) return accessibilityHint;
    if (error) return `Error. ${error}`;
    return helperText;
  }, [accessibilityHint, error, helperText]);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.muted}
        accessibilityLabel={resolvedAccessibilityLabel}
        accessibilityHint={resolvedAccessibilityHint}
        accessibilityState={{ disabled: !editable }}
        allowFontScaling={false}
        editable={editable}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: error ? theme.danger : theme.border,
            backgroundColor: theme.card,
          },
          inputStyle,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      {!error && helperText ? <Text style={[styles.helper, { color: theme.muted }]}>{helperText}</Text> : null}
    </View>
  );
}

export const AppInput = memo(AppInputComponent);

const styles = StyleSheet.create({
  wrapper: {
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  error: {
    fontSize: 10,
    fontWeight: "500",
  },
  helper: {
    fontSize: 9,
  },
});
