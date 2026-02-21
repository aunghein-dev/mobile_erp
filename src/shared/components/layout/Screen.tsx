import React, { memo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  includeTopInset?: boolean;
  showMenuButton?: boolean;
};

function hasDrawerState(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  const record = state as { type?: unknown; routes?: unknown; index?: unknown };
  if (record.type === "drawer") return true;
  if (!Array.isArray(record.routes) || !record.routes.length) return false;
  const index = typeof record.index === "number" ? record.index : 0;
  const route = record.routes[index] as { state?: unknown } | undefined;
  return hasDrawerState(route?.state);
}

function ScreenComponent({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style,
  includeTopInset = false,
  showMenuButton = false,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const nav = navigation as {
    getState?: () => unknown;
    dispatch?: (action: unknown) => void;
    openDrawer?: () => void;
  };
  const canOpenDrawer =
    showMenuButton && (typeof nav.openDrawer === "function" || hasDrawerState(nav.getState?.()));
  const menuOffsetTop = includeTopInset ? 8 : Math.max(insets.top + 8, 8);
  const menuVerticalPadding = canOpenDrawer ? 46 : 0;

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.primary}
      colors={[theme.primary, theme.accent]}
    />
  ) : undefined;

  return (
    <SafeAreaView
      edges={includeTopInset ? ["top", "left", "right"] : ["left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <LinearGradient
        colors={["#EDF4FA", "#F8FBFF", "#F3F8FB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, style]}
      >
        {canOpenDrawer ? (
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            accessibilityHint="Open sidebar navigation"
            onPress={() => {
              if (typeof nav.openDrawer === "function") {
                nav.openDrawer();
                return;
              }
              nav.dispatch?.(DrawerActions.openDrawer());
            }}
            style={[
              styles.menuButton,
              {
                top: menuOffsetTop,
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
          >
            <MaterialCommunityIcons name="menu" size={20} color={theme.text} />
          </AppPressable>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(insets.top, 8) : 0}
          style={styles.keyboardView}
        >
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentInsetAdjustmentBehavior="automatic"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              contentContainerStyle={[
                styles.contentContainer,
                {
                  paddingTop: 12 + menuVerticalPadding,
                  paddingBottom: 16 + Math.max(insets.bottom, 8),
                },
                contentContainerStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.contentContainer,
                {
                  paddingTop: 12 + menuVerticalPadding,
                  paddingBottom: 16 + Math.max(insets.bottom, 8),
                },
                contentContainerStyle,
              ]}
            >
              {children}
            </View>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

export const Screen = memo(ScreenComponent);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  menuButton: {
    position: "absolute",
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0E1828",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    zIndex: 5,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
});
