import React, { useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppButton } from "@/shared/components/ui/AppButton";
import { AppInput } from "@/shared/components/ui/AppInput";
import { DrawerSheet } from "@/shared/components/ui/DrawerSheet";
import { ListRow } from "@/shared/components/ui/ListRow";
import { EmptyState, LoadingState } from "@/shared/components/ui/StateViews";
import { useTeller } from "@/features/hooks/user/useTeller";
import { useBilling } from "@/features/hooks/billing/useBilling";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { api } from "@/shared/lib/api/client";
import { canCreateTeller } from "@/shared/constants/plans";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { routes } from "@/shared/lib/api/routes";
import { putMultipartWithFallback } from "@/shared/lib/api/multipart";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { Teller } from "@/shared/types/user";

export default function UsersScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bizId = useBusinessStore((s) => s.bizId);
  const { tellers, isLoading } = useTeller();
  const { billing } = useBilling();

  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Cashier");
  const [shopId, setShopId] = useState("0");
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<Teller | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editTarget, setEditTarget] = useState<Teller | null>(null);
  const [editFullName, setEditFullName] = useState("");

  const allowed = useMemo(() => {
    return canCreateTeller(tellers.length, billing?.currExpireDate || "", billing?.currPlanCode || "");
  }, [tellers.length, billing?.currExpireDate, billing?.currPlanCode]);

  const filteredTellers = useMemo(() => {
    if (!search.trim()) return tellers;
    const keyword = search.trim().toLowerCase();
    return tellers.filter((entry) => {
      return (
        (entry.fullName || "").toLowerCase().includes(keyword) ||
        entry.username.toLowerCase().includes(keyword) ||
        (entry.role || "").toLowerCase().includes(keyword) ||
        String(entry.shopId ?? 0).includes(keyword)
      );
    });
  }, [search, tellers]);

  const createTeller = useMutation({
    mutationFn: async () => {
      if (!bizId) throw new Error("No business selected");
      await api.post(
        routes.users.createTeller(bizId),
        {
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
          shopId: Number(shopId || 0),
        },
        {
          withCredentials: true,
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tellers(bizId) });
      setCreateOpen(false);
      setFullName("");
      setUsername("");
      setPassword("");
      setRole("Cashier");
      setShopId("0");
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, password: nextPassword }: { userId: number; password: string }) => {
      const formData = new FormData();
      formData.append("newPassword", nextPassword);
      await putMultipartWithFallback(routes.auth.resetPassword(userId), formData, true);
    },
  });

  const updateTellerName = useMutation({
    mutationFn: async ({ userId, fullName: nextName }: { userId: number; fullName: string }) => {
      await api.put(
        routes.auth.editName(userId),
        { fullName: nextName },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tellers(bizId) });
    },
  });

  const onCreate = async () => {
    if (!fullName.trim() || !username.trim() || password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Full name, username and password are required.",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid email",
        text2: "Username must be a valid email address.",
      });
      return;
    }

    try {
      await createTeller.mutateAsync();
      Toast.show({
        type: "success",
        text1: "Teller account created",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Create failed",
        text2: getErrorMessage(error, "Unable to create teller"),
      });
    }
  };

  const onOpenReset = (user: Teller) => {
    if (user.id == null) {
      Toast.show({
        type: "error",
        text1: "User ID unavailable",
        text2: "This account cannot be reset from mobile yet.",
      });
      return;
    }
    setResetTarget(user);
    setNewPassword("");
  };

  const onOpenEditName = (user: Teller) => {
    if (user.id == null) {
      Toast.show({
        type: "error",
        text1: "User ID unavailable",
        text2: "This account cannot be edited from mobile yet.",
      });
      return;
    }
    setEditTarget(user);
    setEditFullName(user.fullName || "");
  };

  const onResetPassword = async () => {
    if (resetTarget?.id == null) return;
    if (newPassword.trim().length < 6) {
      Toast.show({
        type: "error",
        text1: "Invalid password",
        text2: "Password must be at least 6 characters.",
      });
      return;
    }

    try {
      await resetPassword.mutateAsync({ userId: resetTarget.id, password: newPassword.trim() });
      Toast.show({
        type: "success",
        text1: "Password reset",
        text2: `${resetTarget.username} password updated.`,
      });
      setResetTarget(null);
      setNewPassword("");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Reset failed",
        text2: getErrorMessage(error, "Unable to reset password"),
      });
    }
  };

  const onSaveEditName = async () => {
    if (editTarget?.id == null) return;
    if (!editFullName.trim()) {
      Toast.show({
        type: "error",
        text1: "Full name is required",
      });
      return;
    }

    try {
      await updateTellerName.mutateAsync({ userId: editTarget.id, fullName: editFullName.trim() });
      Toast.show({
        type: "success",
        text1: "Teller updated",
      });
      setEditTarget(null);
      setEditFullName("");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: getErrorMessage(error, "Unable to update teller"),
      });
    }
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading teller accounts..." variant="list" />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle
        title="Teller Management"
        subtitle={`${tellers.length} users`}
        right={
          <AppButton
            label="New Teller"
            variant="secondary"
            onPress={() => setCreateOpen(true)}
            disabled={!allowed}
          />
        }
      />

      {!allowed ? (
        <Text style={styles.noticeText}>
          Plan/user limit reached or billing expired. Upgrade plan to add more tellers.
        </Text>
      ) : null}

      <AppInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, username, role, shop"
      />

      {!filteredTellers.length ? (
        <EmptyState title="No teller users" subtitle="Create first teller account." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={filteredTellers}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <ListRow
              title={item.fullName || item.username}
              subtitle={item.username}
              right={item.role}
              footer={`Shop ID ${item.shopId ?? 0}`}
              actions={[
                {
                  key: "edit",
                  label: "Edit Name",
                  tone: "primary",
                  onPress: () => onOpenEditName(item),
                  disabled: item.id == null || updateTellerName.isPending,
                },
                {
                  key: "reset",
                  label: "Reset Password",
                  tone: "primary",
                  onPress: () => onOpenReset(item),
                  disabled: item.id == null || resetPassword.isPending || updateTellerName.isPending,
                },
              ]}
            />
          )}
        />
      )}

      <DrawerSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title="Create Teller" />
          <AppInput label="Full Name" value={fullName} onChangeText={setFullName} />
          <AppInput
            label="Username (Email)"
            value={username}
            autoCapitalize="none"
            onChangeText={setUsername}
          />
          <AppInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <AppInput
            label="Role"
            value={role}
            onChangeText={setRole}
            helperText="Owner / Manager / Cashier / Supervisor"
          />
          <AppInput label="Shop ID" keyboardType="number-pad" value={shopId} onChangeText={setShopId} />

          <View style={styles.modalActions}>
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => setCreateOpen(false)}
              style={styles.flexBtn}
            />
            <AppButton
              label={createTeller.isPending ? "Creating..." : "Create"}
              onPress={onCreate}
              loading={createTeller.isPending}
              style={styles.flexBtn}
            />
          </View>
        </ScrollView>
      </DrawerSheet>

      <DrawerSheet
        visible={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title="Reset Teller Password" subtitle={resetTarget?.username || ""} />
          <AppInput
            label="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <View style={styles.modalActions}>
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => setResetTarget(null)}
              style={styles.flexBtn}
            />
            <AppButton
              label={resetPassword.isPending ? "Resetting..." : "Reset"}
              onPress={onResetPassword}
              loading={resetPassword.isPending}
              style={styles.flexBtn}
            />
          </View>
        </ScrollView>
      </DrawerSheet>

      <DrawerSheet
        visible={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title="Edit Teller Name" subtitle={editTarget?.username || ""} />
          <AppInput label="Full Name" value={editFullName} onChangeText={setEditFullName} />
          <View style={styles.modalActions}>
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => setEditTarget(null)}
              style={styles.flexBtn}
            />
            <AppButton
              label={updateTellerName.isPending ? "Saving..." : "Save"}
              onPress={onSaveEditName}
              loading={updateTellerName.isPending}
              style={styles.flexBtn}
            />
          </View>
        </ScrollView>
      </DrawerSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noticeText: {
    fontSize: 11,
    color: "#B67215",
    backgroundColor: "#FFF7EC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listWrap: {
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,26,42,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 14,
    gap: 10,
    maxHeight: "84%",
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalScroll: {
    maxHeight: "100%",
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  flexBtn: {
    flex: 1,
  },
});
