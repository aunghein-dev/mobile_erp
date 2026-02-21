import React, { memo, useMemo } from "react";
import { Platform, Pressable, PressableProps, PressableStateCallbackType, StyleProp, ViewStyle } from "react-native";

type TouchEffect = "default" | "none";

type AppPressableProps = PressableProps & {
  touchEffect?: TouchEffect;
  pressScale?: number;
  pressedOpacity?: number;
  disabledOpacity?: number;
  rippleColor?: string;
};

function resolveStyle(
  style: PressableProps["style"],
  state: PressableStateCallbackType
): StyleProp<ViewStyle> {
  if (typeof style === "function") {
    return style(state);
  }
  return style;
}

function AppPressableComponent({
  style,
  touchEffect = "default",
  pressScale = 0.985,
  pressedOpacity = 0.82,
  disabledOpacity = 0.55,
  rippleColor = "rgba(15, 26, 42, 0.12)",
  android_ripple,
  disabled,
  ...props
}: AppPressableProps) {
  const ripple = useMemo(() => {
    if (android_ripple) return android_ripple;
    if (Platform.OS !== "android" || touchEffect === "none") return undefined;
    return { color: rippleColor };
  }, [android_ripple, touchEffect, rippleColor]);

  return (
    <Pressable
      android_ripple={ripple}
      disabled={disabled}
      style={(state) => {
        const incomingStyle = resolveStyle(style, state);
        if (touchEffect === "none") return incomingStyle;
        const isPressed = Boolean(state.pressed && !disabled);
        const feedbackStyle: ViewStyle = {
          opacity: disabled ? disabledOpacity : isPressed ? pressedOpacity : 1,
          transform: [{ scale: isPressed ? pressScale : 1 }],
        };
        return [feedbackStyle, incomingStyle];
      }}
      {...props}
    />
  );
}

export const AppPressable = memo(AppPressableComponent);
