import React, { memo } from "react";
import { DrawerActions, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuthStore } from "@/shared/store/useAuthStore";
import LoginScreen from "@/features/screens/auth/LoginScreen";
import { drawerScreens } from "@/app/navigation/drawerScreens";
import { AppDrawerContent } from "@/app/navigation/components/AppDrawerContent";
import { DrawerTopBar } from "@/app/navigation/components/DrawerTopBar";
import { routeIconMap, type DrawerRoute } from "@/app/navigation/meta";
import type { AuthStackParamList, AppDrawerParamList, RootStackParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Drawer = createDrawerNavigator<AppDrawerParamList>();

const AuthNavigator = memo(function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
});

const DrawerNavigator = memo(function DrawerNavigator() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={({ route }) => ({
        header: ({ navigation, route: headerRoute }) => (
          <DrawerTopBar
            routeName={headerRoute.name as DrawerRoute}
            onToggleDrawer={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            onGoHome={() => navigation.navigate("Home")}
            onOpenCart={() => navigation.navigate("Home", { openCartAt: Date.now() })}
          />
        ),
        drawerStyle: {
          width: 318,
          backgroundColor: theme.background,
          marginTop: 0,
          marginBottom: 0,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          overflow: "hidden",
        },
        sceneStyle: {
          backgroundColor: theme.background,
        },
        drawerIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={routeIconMap[route.name as keyof AppDrawerParamList]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      {drawerScreens.map((screen) => (
        <Drawer.Screen key={screen.name} name={screen.name} component={screen.component as React.ComponentType<any>} />
      ))}
    </Drawer.Navigator>
  );
});

function createNavigationTheme(theme: ReturnType<typeof useTheme>): Theme {
  return {
    dark: false,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: "#FFFFFF",
      text: theme.text,
      border: theme.border,
      notification: theme.accent,
    },
    fonts: {
      regular: {
        fontFamily: "System",
        fontWeight: "400",
      },
      medium: {
        fontFamily: "System",
        fontWeight: "500",
      },
      bold: {
        fontFamily: "System",
        fontWeight: "700",
      },
      heavy: {
        fontFamily: "System",
        fontWeight: "800",
      },
    },
  };
}

export default function AppNavigator() {
  const theme = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <NavigationContainer theme={createNavigationTheme(theme)}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={DrawerNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
