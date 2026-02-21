import React, { memo } from "react";
import { Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTranslation } from "@/features/hooks/useTranslation";
import { useCartStore } from "@/shared/store/useCartStore";
import { DrawerRoute, resolveRouteTitle, routeIconMap } from "@/app/navigation/meta";
import { navigationStyles } from "@/app/navigation/styles";

type DrawerTopBarProps = {
  routeName: DrawerRoute;
  onToggleDrawer: () => void;
  onGoHome: () => void;
  onOpenCart: () => void;
};

function DrawerTopBarComponent({
  routeName,
  onToggleDrawer,
  onGoHome,
  onOpenCart,
}: DrawerTopBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const totalQty = useCartStore((state) => state.totalQty);
  const displayTitle = resolveRouteTitle(routeName, t);

  return (
    <View
        style={[
          navigationStyles.topBarWrap,
          {
            backgroundColor: theme.background,
            paddingTop: Math.max(insets.top, 8),
          },
        ]}
    >
      <View style={[navigationStyles.topBarShell, { borderColor: theme.border, backgroundColor: "#FFFFFF" }]}>
        <View style={navigationStyles.topBarInner}>
          <AppPressable
            onPress={onToggleDrawer}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            accessibilityHint="Open side navigation"
            style={({ pressed }) => [
              navigationStyles.topIconBtn,
              navigationStyles.topMenuBtn,
              { borderColor: `${theme.primary}35`, backgroundColor: `${theme.primary}12` },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name="menu" size={23} color={theme.primary} />
          </AppPressable>

          <View style={navigationStyles.topBarTitleBlock}>
            <View style={navigationStyles.topTitleRow}>
              <View style={[navigationStyles.topRouteIcon, { backgroundColor: `${theme.primary}12` }]}>
                <MaterialCommunityIcons name={routeIconMap[routeName]} size={13} color={theme.primary} />
              </View>
              <Text numberOfLines={1} style={[navigationStyles.topTitleText, { color: theme.text }]}>
                {displayTitle}
              </Text>
            </View>
          </View>

          <View style={navigationStyles.topActions}>
            {routeName !== "Home" ? (
              <AppPressable
                onPress={onGoHome}
                accessibilityRole="button"
                accessibilityLabel="Go home"
                style={({ pressed }) => [
                  navigationStyles.topIconBtn,
                  { borderColor: theme.border, backgroundColor: "#FFFFFF" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons name="home-outline" size={20} color={theme.text} />
              </AppPressable>
            ) : null}
            <AppPressable
              onPress={onOpenCart}
              accessibilityRole="button"
              accessibilityLabel="Open cart"
              accessibilityHint="Go to checkout cart"
              style={({ pressed }) => [
                navigationStyles.topCartBtn,
                {
                  borderColor: totalQty > 0 ? `${theme.primary}48` : theme.border,
                  backgroundColor: totalQty > 0 ? `${theme.primary}14` : "#FFFFFF",
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons
                name="cart-outline"
                size={20}
                color={totalQty > 0 ? theme.primary : theme.text}
              />
              {totalQty > 0 ? (
                <View style={[navigationStyles.topCartBadge, { backgroundColor: theme.danger }]}>
                  <Text style={navigationStyles.topCartBadgeText}>{totalQty > 99 ? "99+" : totalQty}</Text>
                </View>
              ) : null}
            </AppPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export const DrawerTopBar = memo(DrawerTopBarComponent);
