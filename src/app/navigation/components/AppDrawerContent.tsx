import React, { memo } from "react";
import { Image, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { DrawerContentComponentProps, DrawerContentScrollView } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTranslation } from "@/features/hooks/useTranslation";
import { useLogout } from "@/features/hooks/auth/useAuth";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { brandImages } from "@/shared/assets/branding/images";
import {
  DrawerRoute,
  groupedDrawerItems,
  groupLabelMap,
  resolveRouteTitle,
  routeIconMap,
} from "@/app/navigation/meta";
import { navigationStyles } from "@/app/navigation/styles";

function AppDrawerContentComponent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const logout = useLogout();
  const bizId = useBusinessStore((state) => state.bizId);
  const businessName = useBusinessStore((state) => state.businessName);
  const currentRoute = props.state.routeNames[props.state.index] as DrawerRoute;
  const businessLabel = businessName?.trim() || (bizId ? `Business #${bizId}` : "Business Workspace");

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={navigationStyles.drawerContentContainer}
      style={navigationStyles.drawerScroll}
    >
      <LinearGradient
        colors={[`${theme.primary}20`, `${theme.accent}14`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[navigationStyles.drawerHero, { borderColor: theme.border }]}
      >
        <View style={navigationStyles.drawerHeroTop}>
          <View style={[navigationStyles.drawerBrandIcon, { borderColor: `${theme.primary}2E` }]}>
            <Image source={brandImages.logo} style={navigationStyles.drawerBrandImage} resizeMode="contain" />
          </View>
          <View style={navigationStyles.drawerBrandTextWrap}>
            <Text style={[navigationStyles.drawerBrandTitle, { color: theme.text }]}>OPENWARE.POS</Text>
            <Text numberOfLines={1} style={[navigationStyles.drawerBrandSubtitle, { color: theme.muted }]}>
              {businessLabel}
            </Text>
          </View>
        </View>

        <View style={navigationStyles.drawerHeroStatusRow}>
          <View
            style={[
              navigationStyles.drawerHeroStatusBadge,
              { borderColor: `${theme.success}4D`, backgroundColor: `${theme.success}18` },
            ]}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={14} color={theme.success} />
            <Text style={[navigationStyles.drawerHeroStatusText, { color: theme.success }]}>Secure Session</Text>
          </View>
          <Text style={[navigationStyles.drawerHeroMeta, { color: theme.muted }]}>ERP Mobile</Text>
        </View>
      </LinearGradient>

      {groupedDrawerItems.map(({ group, items }) => {
        if (!items.length) return null;

        return (
          <View key={group.key} style={[navigationStyles.groupBlock, { borderColor: theme.border }]}>
            <View style={[navigationStyles.groupHeader, { borderBottomColor: theme.border }]}>
              <Text style={[navigationStyles.groupTitle, { color: theme.muted }]}>
                {groupLabelMap[group.key] || group.title}
              </Text>
            </View>

            <View style={navigationStyles.groupBody}>
              {items.map((item) => {
                const route = item.route as DrawerRoute;
                const isActive = currentRoute === route;

                return (
                  <AppPressable
                    key={item.id}
                    onPress={() => props.navigation.navigate(route)}
                    accessibilityRole="button"
                    accessibilityLabel={resolveRouteTitle(route, t)}
                    accessibilityHint="Open section"
                    accessibilityState={{ selected: isActive }}
                    style={({ pressed }) => [
                      navigationStyles.groupItem,
                      {
                        borderWidth: isActive ? 1 : 0,
                        borderColor: isActive ? `${theme.primary}42` : "transparent",
                        backgroundColor: isActive ? `${theme.primary}10` : "transparent",
                      },
                      pressed && {
                        opacity: 0.9,
                        backgroundColor: isActive ? `${theme.primary}16` : `${theme.primary}0C`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        navigationStyles.groupItemIconWrap,
                        {
                          borderWidth: isActive ? 1 : 0,
                          borderColor: isActive ? `${theme.primary}38` : "transparent",
                          backgroundColor: isActive ? `${theme.primary}1D` : theme.card,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={routeIconMap[route]}
                        size={18}
                        color={isActive ? theme.primary : theme.muted}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        navigationStyles.groupItemText,
                        { color: isActive ? theme.text : theme.text },
                        isActive && navigationStyles.groupItemTextActive,
                      ]}
                    >
                      {resolveRouteTitle(route, t)}
                    </Text>
                    {isActive ? (
                      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.primary} />
                    ) : null}
                  </AppPressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={navigationStyles.drawerFooterSpacer} />

      <AppPressable
        onPress={() => logout.mutate()}
        disabled={logout.isPending}
        accessibilityRole="button"
        accessibilityLabel={logout.isPending ? "Signing out" : "Sign out"}
        accessibilityHint="End current session"
        style={({ pressed }) => [
          navigationStyles.signOutBtn,
          { borderColor: `${theme.danger}35`, backgroundColor: `${theme.danger}12` },
          pressed && { opacity: 0.88 },
          logout.isPending && navigationStyles.disabledBtn,
        ]}
      >
        <MaterialCommunityIcons name="logout" size={18} color={theme.danger} />
        <Text style={[navigationStyles.signOutText, { color: theme.danger }]}>
          {logout.isPending ? "Signing out..." : "Sign Out"}
        </Text>
      </AppPressable>
    </DrawerContentScrollView>
  );
}

export const AppDrawerContent = memo(AppDrawerContentComponent);
