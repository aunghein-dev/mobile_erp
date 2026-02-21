import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui/StateViews";
import { useShops } from "@/features/hooks/business/useShops";
import { useInfo } from "@/features/hooks/business/useInfo";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";
import type { Shop } from "@/shared/types/business";

export default function ShopsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { business } = useInfo();
  const { shops, error, isLoading, refresh } = useShops();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    shopName: "",
    shopAddress: "",
    phoneNum1: "",
    phoneNum2: "",
    shopTownship: "",
    shopCity: "",
  });
  const toTrimmedText = (value: string | null | undefined) => (value || "").trim();

  const editingShop = useMemo(() => shops.find((entry) => entry.shopId === editingId) || null, [shops, editingId]);
  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((shop) => {
      const fields = [
        shop.shopName,
        shop.shopAddress,
        shop.phoneNum1,
        shop.phoneNum2,
        shop.shopTownship,
        shop.shopCity,
        String(shop.shopId),
      ];
      return fields.some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [search, shops]);

  const cityCount = useMemo(
    () =>
      new Set(
        shops
          .map((shop) => toTrimmedText(shop.shopCity).toLowerCase())
          .filter((city) => city.length)
      ).size,
    [shops]
  );
  const secondaryPhoneCount = useMemo(
    () => shops.filter((shop) => toTrimmedText(shop.phoneNum2).length > 0).length,
    [shops]
  );

  const saveShop = useMutation({
    mutationFn: async () => {
      if (!business?.businessId) throw new Error("No business selected");

      if (editingId) {
        await api.put(
          routes.business.shopUpsert,
          {
            shopId: editingId,
            bizId: business.businessId,
            ...formData,
          },
          { withCredentials: true }
        );
        return;
      }

      await api.post(
        routes.business.shopUpsert,
        {
          bizId: business.businessId,
          ...formData,
        },
        { withCredentials: true }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shops(business?.businessId) });
      resetForm();
    },
  });

  const removeShop = useMutation({
    mutationFn: async (shopId: number) => {
      await api.delete(routes.business.shopDelete(shopId), { withCredentials: true });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shops(business?.businessId) });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      shopName: "",
      shopAddress: "",
      phoneNum1: "",
      phoneNum2: "",
      shopTownship: "",
      shopCity: "",
    });
  };

  const loadShop = (shop: Shop) => {
    setEditingId(shop.shopId);
    setFormData({
      shopName: shop.shopName || "",
      shopAddress: shop.shopAddress || "",
      phoneNum1: shop.phoneNum1 || "",
      phoneNum2: shop.phoneNum2 || "",
      shopTownship: shop.shopTownship || "",
      shopCity: shop.shopCity || "",
    });
  };

  const onSave = async () => {
    if (!formData.shopName.trim() || !formData.phoneNum1.trim()) {
      Toast.show({ type: "error", text1: "Shop name and primary phone are required" });
      return;
    }

    try {
      await saveShop.mutateAsync();
      Toast.show({
        type: "success",
        text1: editingId ? "Shop updated" : "Shop created",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: getErrorMessage(error, "Unable to save shop"),
      });
    }
  };

  const onDelete = async (shopId: number) => {
    setDeletingId(shopId);
    try {
      await removeShop.mutateAsync(shopId);
      if (editingId === shopId) {
        resetForm();
      }
      Toast.show({ type: "success", text1: "Shop deleted" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Delete failed",
        text2: getErrorMessage(error, "Unable to delete shop"),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (shop: Shop) => {
    Alert.alert("Delete shop?", `${shop.shopName || "This shop"} will be removed from this business.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void onDelete(shop.shopId);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading shops..." variant="cards" />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle
        title="Shop Management"
        subtitle={editingShop ? `Editing #${editingShop.shopId} ${editingShop.shopName}` : `${shops.length} branch(es)`}
      />

      <Card style={[styles.summaryCard, { borderColor: `${theme.primary}2F`, backgroundColor: `${theme.primary}0D` }]}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleWrap}>
            <MaterialCommunityIcons name="storefront-outline" size={19} color={theme.primary} />
            <View style={styles.summaryTitleText}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>Branch network</Text>
              <Text style={[styles.summarySubtitle, { color: theme.muted }]}>
                Keep contacts and location data synced with your web app.
              </Text>
            </View>
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Refresh shops"
            onPress={() => {
              void refresh();
            }}
            style={({ pressed }) => [
              styles.refreshButton,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
          </AppPressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{shops.length}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Total Shops</Text>
          </View>
          <View style={[styles.statPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{cityCount}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Cities</Text>
          </View>
          <View style={[styles.statPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{secondaryPhoneCount}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Backup Phones</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formTitleWrap}>
            <MaterialCommunityIcons
              name={editingId ? "pencil-circle-outline" : "plus-circle-outline"}
              size={18}
              color={theme.primary}
            />
            <Text style={[styles.formTitle, { color: theme.text }]}>{editingId ? "Edit Shop" : "Create Shop"}</Text>
          </View>
          {editingId ? (
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel="Cancel edit"
              onPress={resetForm}
              style={({ pressed }) => [
                styles.cancelPill,
                { borderColor: theme.border, backgroundColor: theme.cardSoft, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={[styles.cancelPillLabel, { color: theme.muted }]}>Cancel edit</Text>
            </AppPressable>
          ) : null}
        </View>

        <AppInput
          label="Shop Name"
          value={formData.shopName}
          placeholder="e.g. Dagon Branch"
          onChangeText={(shopName) => setFormData((prev) => ({ ...prev, shopName }))}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <AppInput
          label="Address"
          value={formData.shopAddress}
          placeholder="Street, ward, landmarks"
          onChangeText={(shopAddress) => setFormData((prev) => ({ ...prev, shopAddress }))}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <View style={styles.row2}>
          <AppInput
            label="Primary Phone"
            value={formData.phoneNum1}
            placeholder="09xxxxxxxxx"
            onChangeText={(phoneNum1) => setFormData((prev) => ({ ...prev, phoneNum1 }))}
            keyboardType="phone-pad"
            returnKeyType="next"
            style={styles.flexInput}
          />
          <AppInput
            label="Secondary Phone"
            value={formData.phoneNum2}
            placeholder="Optional"
            onChangeText={(phoneNum2) => setFormData((prev) => ({ ...prev, phoneNum2 }))}
            keyboardType="phone-pad"
            returnKeyType="next"
            style={styles.flexInput}
          />
        </View>
        <View style={styles.row2}>
          <AppInput
            label="Township"
            value={formData.shopTownship}
            placeholder="Township"
            onChangeText={(shopTownship) => setFormData((prev) => ({ ...prev, shopTownship }))}
            autoCapitalize="words"
            returnKeyType="next"
            style={styles.flexInput}
          />
          <AppInput
            label="City"
            value={formData.shopCity}
            placeholder="City"
            onChangeText={(shopCity) => setFormData((prev) => ({ ...prev, shopCity }))}
            autoCapitalize="words"
            returnKeyType="done"
            style={styles.flexInput}
          />
        </View>

        <View style={styles.row2}>
          <AppButton
            label={editingId ? "Update Shop" : "Add Shop"}
            onPress={onSave}
            loading={saveShop.isPending}
            style={styles.flexInput}
            leftIcon={<MaterialCommunityIcons name={editingId ? "content-save-edit-outline" : "plus"} size={16} color="#FFFFFF" />}
          />
          <AppButton
            label={editingId ? "Reset Form" : "Clear"}
            variant="secondary"
            onPress={resetForm}
            style={styles.flexInput}
            leftIcon={<MaterialCommunityIcons name="restore" size={16} color={theme.text} />}
          />
        </View>
      </Card>

      <Card style={styles.listCard}>
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>Shops Directory</Text>
          <Text style={[styles.listMeta, { color: theme.muted }]}>
            {filteredShops.length}/{shops.length} shown
          </Text>
        </View>
        <AppInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, township, city or id"
          accessibilityLabel="Search shops"
          returnKeyType="search"
        />

        {error ? (
          <ErrorState
            title="Unable to load shops"
            subtitle={error instanceof Error ? error.message : "Please check your connection and retry."}
            onRetry={() => {
              void refresh();
            }}
          />
        ) : !shops.length ? (
          <EmptyState title="No shops configured" subtitle="Create your first branch with the form above." />
        ) : !filteredShops.length ? (
          <EmptyState title="No matching shops" subtitle="Try a different keyword." />
        ) : (
          <View style={styles.shopList}>
            {filteredShops.map((shop) => {
              const isEditing = shop.shopId === editingId;
              const cityTownship = [shop.shopTownship, shop.shopCity]
                .map((value) => toTrimmedText(value))
                .filter((value) => value.length > 0)
                .join(", ");
              const address = toTrimmedText(shop.shopAddress);
              const secondaryPhone = toTrimmedText(shop.phoneNum2);
              return (
                <Card
                  key={shop.shopId}
                  style={[styles.shopCard, isEditing ? { borderColor: `${theme.primary}88` } : undefined]}
                >
                  <View style={styles.shopCardTop}>
                    <View style={styles.shopTextWrap}>
                      <Text numberOfLines={1} style={[styles.shopName, { color: theme.text }]}>
                        {shop.shopName || `Shop #${shop.shopId}`}
                      </Text>
                      <Text numberOfLines={1} style={[styles.shopSubline, { color: theme.muted }]}>
                        #{shop.shopId} {cityTownship ? `• ${cityTownship}` : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.modeBadge,
                        {
                          backgroundColor: isEditing ? `${theme.primary}12` : theme.cardSoft,
                          borderColor: isEditing ? `${theme.primary}5A` : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.modeBadgeText, { color: isEditing ? theme.primary : theme.muted }]}>
                        {isEditing ? "Editing" : "Branch"}
                      </Text>
                    </View>
                  </View>

                  {address ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={15} color={theme.muted} />
                      <Text style={[styles.metaText, { color: theme.muted }]} numberOfLines={2}>
                        {address}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="phone-outline" size={15} color={theme.muted} />
                    <Text style={[styles.metaText, { color: theme.text }]} numberOfLines={1}>
                      {shop.phoneNum1 || "-"}
                    </Text>
                  </View>

                  {secondaryPhone ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="phone-plus-outline" size={15} color={theme.muted} />
                      <Text style={[styles.metaText, { color: theme.muted }]} numberOfLines={1}>
                        {secondaryPhone}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.cardActions}>
                    <AppButton
                      label="Edit"
                      variant="secondary"
                      onPress={() => loadShop(shop)}
                      style={styles.flexInput}
                      leftIcon={<MaterialCommunityIcons name="pencil-outline" size={15} color={theme.text} />}
                    />
                    <AppButton
                      label={deletingId === shop.shopId ? "Deleting..." : "Delete"}
                      variant="danger"
                      onPress={() => confirmDelete(shop)}
                      disabled={removeShop.isPending}
                      style={styles.flexInput}
                      leftIcon={<MaterialCommunityIcons name="trash-can-outline" size={15} color="#FFFFFF" />}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  summaryTitleText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  summarySubtitle: {
    fontSize: 11,
    lineHeight: 17,
  },
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  formCard: {
    gap: 12,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  formTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  cancelPill: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelPillLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  listCard: {
    gap: 10,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  listMeta: {
    fontSize: 11,
    fontWeight: "600",
  },
  shopList: {
    gap: 10,
  },
  shopCard: {
    gap: 8,
  },
  shopCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  shopTextWrap: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    fontSize: 13,
    fontWeight: "800",
  },
  shopSubline: {
    fontSize: 11,
  },
  modeBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
});
