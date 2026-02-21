import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTranslation } from "@/features/hooks/useTranslation";
import { useLogin } from "@/features/hooks/auth/useAuth";
import { useRememberLoginStore } from "@/shared/store/useRememberLoginStore";
import { brandImages } from "@/shared/assets/branding/images";

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const login = useLogin();
  const rememberedEnabled = useRememberLoginStore((s) => s.remember);
  const rememberedUsername = useRememberLoginStore((s) => s.username);
  const rememberedPassword = useRememberLoginStore((s) => s.password);
  const setRememberLogin = useRememberLoginStore((s) => s.setRememberLogin);
  const clearRememberLogin = useRememberLoginStore((s) => s.clearRememberLogin);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!rememberedEnabled) return;
    setUsername(rememberedUsername);
    setPassword(rememberedPassword);
    setRememberMe(true);
  }, [rememberedEnabled, rememberedUsername, rememberedPassword]);

  const canSubmit = useMemo(() => {
    return username.trim().length > 3 && password.length >= 6;
  }, [username, password]);

  const onSubmit = async () => {
    if (!canSubmit || login.isPending) return;
    const normalizedUsername = username.trim();
    const normalizedPassword = password;

    try {
      await login.mutateAsync({ username: normalizedUsername, password: normalizedPassword });
      if (rememberMe) {
        setRememberLogin({
          remember: true,
          username: normalizedUsername,
          password: normalizedPassword,
        });
      } else {
        clearRememberLogin();
      }

      Toast.show({
        type: "success",
        text1: t("success") || "Success",
        text2: "Signed in successfully.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login";
      Toast.show({
        type: "error",
        text1: t("msg_wrong") || "Something went wrong",
        text2: message,
      });
    }
  };

  return (
    <Screen includeTopInset showMenuButton={false} scroll contentContainerStyle={styles.contentContainer}>
      <View style={styles.bgLayer} pointerEvents="none">
        <View style={[styles.bgOrbTop, { backgroundColor: `${theme.primary}1C` }]} />
        <View style={[styles.bgOrbBottom, { backgroundColor: `${theme.accent}20` }]} />
      </View>

      <View style={styles.layout}>
        <View style={styles.hero}>
          <View style={[styles.brandChip, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View
              style={[
                styles.logoWrap,
                {
                  borderColor: `${theme.primary}36`,
                  backgroundColor: `${theme.primary}14`,
                },
              ]}
            >
              <Image source={brandImages.logo} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={[styles.brandTitle, { color: theme.text }]}>Openware ERP</Text>
              <Text style={[styles.brandSubtitle, { color: theme.muted }]}>Retail POS Workspace</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            {["Secure", "Fast", "Realtime"].map((label) => (
              <View
                key={label}
                style={[styles.badge, { borderColor: theme.border, backgroundColor: `${theme.card}D8` }]}
              >
                <Text style={[styles.badgeText, { color: theme.muted }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.formTitleWrap}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Welcome back</Text>
            <Text style={[styles.formSubtitle, { color: theme.muted }]}>
              Sign in to continue your inventory, POS, and reports.
            </Text>
          </View>

          <AppInput
            label={t("lbl_username") || "Username"}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            keyboardType="email-address"
            value={username}
            onChangeText={setUsername}
            placeholder="owner@business.com"
            returnKeyType="next"
          />

          <View style={styles.passwordField}>
            <Text style={[styles.passwordLabel, { color: theme.text }]}>Password</Text>
            <View style={[styles.passwordWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                placeholder="Enter your password"
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
              <AppPressable onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.muted}
                />
              </AppPressable>
            </View>
          </View>

          <AppPressable onPress={() => setRememberMe((value) => !value)} style={styles.rememberRow}>
            <View
              style={[
                styles.switchTrack,
                {
                  borderColor: rememberMe ? theme.primary : theme.border,
                  backgroundColor: rememberMe ? `${theme.primary}2A` : theme.cardSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: rememberMe ? theme.primary : "#FFFFFF",
                    transform: [{ translateX: rememberMe ? 16 : 0 }],
                  },
                ]}
              />
            </View>
            <Text style={[styles.rememberLabel, { color: theme.text }]}>Remember me on this device</Text>
          </AppPressable>

          <AppButton
            label={login.isPending ? "Signing in..." : "Sign In"}
            onPress={onSubmit}
            disabled={!canSubmit || login.isPending}
            loading={login.isPending}
          />

          <View
            style={[
              styles.footNote,
              {
                borderColor: theme.border,
                backgroundColor: theme.cardSoft,
              },
            ]}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={theme.success} />
            <Text style={[styles.footNoteText, { color: theme.muted }]}>
              Encrypted session with secure API authentication.
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrbTop: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 10,
    top: -70,
    right: -40,
  },
  bgOrbBottom: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 10,
    bottom: -110,
    left: -80,
  },
  layout: {
    gap: 18,
  },
  hero: {
    gap: 10,
  },
  brandChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  brandCopy: {
    flex: 1,
    gap: 1,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  formTitleWrap: {
    gap: 3,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  formSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  formCard: {
    gap: 13,
    paddingBottom: 14,
  },
  passwordField: {
    gap: 6,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  passwordWrap: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 10,
  },
  passwordToggle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  switchTrack: {
    width: 40,
    height: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 10,
  },
  rememberLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  footNote: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footNoteText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 16,
  },
});
