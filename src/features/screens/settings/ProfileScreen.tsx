import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { LoadingState, ErrorState } from "@/shared/components/ui/StateViews";
import { api } from "@/shared/lib/api/client";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatDateTime } from "@/shared/lib/utils/format";
import type { UserProfile } from "@/shared/types/user";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type RawUserProfile = UserProfile & {
  accountId?: number;
  userId?: number;
  rowId?: number;
};

export default function ProfileScreen() {
  const theme = useTheme();
  const query = useQuery({
    queryKey: ["profile", "auth-info"],
    queryFn: async () => {
      const response = await api.get<RawUserProfile>(routes.auth.info, { withCredentials: true });
      const raw = response.data;
      return {
        ...raw,
        id: raw.id ?? raw.accountId ?? raw.userId ?? raw.rowId ?? 0,
      } satisfies UserProfile;
    },
  });

  const [fullName, setFullName] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState("image/jpeg");
  const [selectedImageName, setSelectedImageName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setFullName(query.data.fullName || "");
    setSelectedImageUri(null);
    setSelectedImageName("");
  }, [query.data]);

  const saveName = useMutation({
    mutationFn: async () => {
      if (!query.data?.id) throw new Error("No profile loaded");
      await api.put(
        routes.auth.editName(query.data.id),
        {
          fullName: fullName.trim(),
        },
        {
          withCredentials: true,
        }
      );
    },
  });

  const uploadImage = useMutation({
    mutationFn: async () => {
      if (!query.data?.id || !selectedImageUri) throw new Error("Image not selected");
      const formData = new FormData();
      formData.append("profilePicture", {
        uri: selectedImageUri,
        name: selectedImageName || `profile-${Date.now()}.jpg`,
        type: selectedImageType,
      } as unknown as Blob);

      await api.put(routes.auth.editProfilePicture(query.data.id), formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!query.data?.id) throw new Error("No profile loaded");
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");

      const formData = new FormData();
      formData.append("newPassword", newPassword);
      await api.put(routes.auth.resetPassword(query.data.id), formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission required",
        text2: "Photo library permission is required.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const fileSize = Number(asset.fileSize ?? 0);
    if (fileSize > 3 * 1024 * 1024) {
      Toast.show({
        type: "error",
        text1: "Image too large",
        text2: "Select an image below 3MB.",
      });
      return;
    }

    setSelectedImageUri(asset.uri);
    setSelectedImageType(asset.mimeType || "image/jpeg");
    setSelectedImageName(asset.fileName || `profile-${Date.now()}.jpg`);
  };

  const onSaveProfile = async () => {
    try {
      await saveName.mutateAsync();
      Toast.show({ type: "success", text1: "Profile updated" });
      await query.refetch();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: getErrorMessage(error, "Unable to update profile"),
      });
    }
  };

  const onUploadImage = async () => {
    try {
      await uploadImage.mutateAsync();
      Toast.show({ type: "success", text1: "Profile image updated" });
      setSelectedImageUri(null);
      setSelectedImageName("");
      await query.refetch();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Image upload failed",
        text2: getErrorMessage(error, "Unable to upload profile image"),
      });
    }
  };

  const onResetPassword = async () => {
    try {
      await resetPassword.mutateAsync();
      Toast.show({ type: "success", text1: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Password update failed",
        text2: getErrorMessage(error, "Unable to update password"),
      });
    }
  };

  if (query.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading profile..." variant="form" />
      </Screen>
    );
  }

  if (query.error || !query.data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to load profile"
          subtitle={query.error instanceof Error ? query.error.message : "Unknown error"}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const user = query.data;
  const displayProfileImage = selectedImageUri || user.userImgUrl || null;
  const hasNameChanges = fullName.trim() !== (user.fullName || "").trim();
  const business = user.business;
  const businessTaxRate = toSafeNumber(business?.taxRate);
  const businessTaxDisplay = businessTaxRate <= 1 ? businessTaxRate * 100 : businessTaxRate;

  return (
    <Screen>
      <SectionTitle title="Profile Settings" subtitle={user.username} />

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Profile Picture</Text>
        <View style={styles.avatarWrap}>
          {displayProfileImage ? (
            <Image source={{ uri: displayProfileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
              <MaterialCommunityIcons name="account" size={42} color={theme.muted} />
            </View>
          )}
        </View>

        <Text style={[styles.helperText, { color: theme.muted }]}>
          {selectedImageName || "PNG, JPG, JPEG, GIF, WebP up to 3MB"}
        </Text>

        <View style={styles.rowActions}>
          <AppButton label="Select Image" variant="secondary" onPress={() => void pickImage()} style={styles.flexBtn} />
          <AppButton
            label={uploadImage.isPending ? "Uploading..." : "Upload Image"}
            onPress={onUploadImage}
            loading={uploadImage.isPending}
            disabled={!selectedImageUri || uploadImage.isPending}
            style={styles.flexBtn}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Account Details</Text>
        <AppInput label="Username" value={user.username} editable={false} />
        <AppInput label="Full Name" value={fullName} onChangeText={setFullName} />
        <AppInput label="Role" value={user.role} editable={false} />
        <AppButton
          label={saveName.isPending ? "Saving..." : "Save Profile Changes"}
          onPress={onSaveProfile}
          loading={saveName.isPending}
          disabled={saveName.isPending || !hasNameChanges}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Associated Business</Text>
        <AppInput label="Business Name" value={business?.businessName || "N/A"} editable={false} />
        <AppInput label="Business Short Name" value={business?.businessNameShortForm || "N/A"} editable={false} />
        <AppInput label="Default Currency" value={business?.defaultCurrency || "N/A"} editable={false} />
        <AppInput label="Tax Rate (%)" value={`${businessTaxDisplay}%`} editable={false} />
        <AppInput
          label="Registered At"
          value={business?.registeredAt ? formatDateTime(business.registeredAt) : "N/A"}
          editable={false}
        />
        {business?.businessLogo ? (
          <View style={styles.businessLogoWrap}>
            <Text style={[styles.logoLabel, { color: theme.text }]}>Business Logo</Text>
            <Image source={{ uri: business.businessLogo }} style={styles.businessLogo} />
          </View>
        ) : null}
        <Text style={[styles.helperText, { color: theme.muted }]}>
          Business details are read-only in profile settings, same as web app.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Password Settings</Text>
        <AppInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <AppInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <AppPressable
          style={({ pressed }) => [styles.showPassRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => setShowPassword((prev) => !prev)}
        >
          <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={16} color={theme.primary} />
          <Text style={[styles.showPassText, { color: theme.primary }]}>
            {showPassword ? "Hide password" : "Show password"}
          </Text>
        </AppPressable>
        <AppButton
          label={resetPassword.isPending ? "Updating..." : "Reset Password"}
          onPress={onResetPassword}
          loading={resetPassword.isPending}
          disabled={resetPassword.isPending || !newPassword || !confirmPassword}
          variant="secondary"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 10,
  },
  avatarFallback: {
    width: 124,
    height: 124,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    fontSize: 10,
    fontWeight: "500",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
  businessLogoWrap: {
    gap: 7,
  },
  logoLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  businessLogo: {
    width: 92,
    height: 92,
    borderRadius: 10,
  },
  showPassRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  showPassText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
