import React, { useMemo, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { Card } from "@/shared/components/ui/Card";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui/StateViews";
import { usePaginationStocks } from "@/features/hooks/inventory/useStocks";
import { useCurrency } from "@/features/hooks/business/useCurrency";
import { api } from "@/shared/lib/api/client";
import { putMultipartWithFallback } from "@/shared/lib/api/multipart";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { AppDrawerParamList } from "@/app/navigation/types";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { StockGroup, StockItem } from "@/shared/types/stock";
import {
  createDraftFromGroup,
  summarizeGroup,
  type EditableStockItem,
  type StockEditDraft,
} from "./inventoryStocksUtils";
import { styles } from "./inventoryStocksStyles";
import { InventoryStockCard } from "./components/InventoryStockCard";
import { InventoryStockEditDrawer } from "./components/InventoryStockEditDrawer";

const PAGE_SIZE = 20;

async function buildStockEditFormData(payload: Record<string, unknown>) {
  const formData = new FormData();
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory is unavailable");
  }
  const jsonUri = `${cacheDir}stock-edit-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  await FileSystem.writeAsStringAsync(jsonUri, JSON.stringify(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  formData.append("json", {
    uri: jsonUri,
    name: "stock-edit.json",
    type: "application/json",
  } as unknown as Blob);
  return {
    formData,
    cleanup: async () => {
      try {
        await FileSystem.deleteAsync(jsonUri, { idempotent: true });
      } catch {}
    },
  };
}

export default function InventoryStocksScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>();
  const bizId = useBusinessStore((s) => s.bizId);
  const { selectedBase, display: displayMoney } = useCurrency();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [editDraft, setEditDraft] = useState<StockEditDraft | null>(null);

  const { items, total, isLoading, error, refresh } = usePaginationStocks(page, PAGE_SIZE, search);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const pageStats = useMemo(() => {
    return items.reduce(
      (acc, group) => {
        const summary = summarizeGroup(group);
        acc.groups += 1;
        acc.variants += summary.variantCount;
        acc.qty += summary.totalQty;
        acc.low += summary.lowStockCount;
        return acc;
      },
      {
        groups: 0,
        variants: 0,
        qty: 0,
        low: 0,
      }
    );
  }, [items]);

  const refreshStockQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["stocks"] });
  };

  const updateStockGroup = useMutation({
    mutationFn: async (draft: StockEditDraft) => {
      const payload = {
        groupName: draft.groupName.trim(),
        groupUnitPrice: Number(draft.groupUnitPrice || 0),
        releasedDate: draft.releasedDate.trim() || null,
        isColorless: draft.isColorless,
        groupOriginalPrice: Number(draft.groupOriginalPrice || 0),
        items: draft.items.map((item) => ({
          itemId: item.itemId,
          itemColorHex: item.itemColorHex.trim() || "#000000",
          itemQuantity: Number(item.itemQuantity || 0),
          barcodeNo: item.barcodeNo.trim(),
          sizing: item.sizing.trim(),
          subPrice: item.subPrice.trim() ? Number(item.subPrice) : null,
          itemImage: item.itemImage || null,
        })),
        shopId: draft.shopId || 0,
        wholesalePrices: draft.wholesalePrices || [],
      };

      const { formData, cleanup } = await buildStockEditFormData(payload);

      try {
        await putMultipartWithFallback(routes.inventory.stockEditGroup(draft.groupId), formData, true);
      } finally {
        await cleanup();
      }
    },
    onSuccess: async () => {
      await refreshStockQueries();
    },
  });

  const deleteStockItem = useMutation({
    mutationFn: async (params: { groupId: number; itemId: number }) => {
      await api.delete(routes.inventory.stockDeleteItem(params.groupId, params.itemId), {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await refreshStockQueries();
    },
  });

  const deleteStockGroup = useMutation({
    mutationFn: async (groupId: number) => {
      if (!bizId) throw new Error("No business selected");
      await api.delete(routes.inventory.stockDeleteGroup(groupId, bizId), {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await refreshStockQueries();
    },
  });

  const openEdit = (groupId: number) => {
    const group = items.find((entry) => entry.groupId === groupId);
    if (!group) {
      Toast.show({
        type: "error",
        text1: "Unable to edit",
        text2: "This group is not loaded on current page.",
      });
      return;
    }
    setEditDraft(createDraftFromGroup(group));
  };

  const closeEdit = () => {
    setEditDraft(null);
  };

  const onSaveEdit = async () => {
    if (!editDraft) return;

    if (!editDraft.groupName.trim()) {
      Toast.show({ type: "error", text1: "Group name is required" });
      return;
    }
    if (Number(editDraft.groupUnitPrice || 0) <= 0) {
      Toast.show({ type: "error", text1: "Unit price must be greater than zero" });
      return;
    }
    if (!editDraft.items.length) {
      Toast.show({ type: "error", text1: "At least one variant is required" });
      return;
    }
    if (editDraft.items.some((item) => !item.barcodeNo.trim())) {
      Toast.show({ type: "error", text1: "Each variant must have a barcode" });
      return;
    }
    if (
      editDraft.wholesalePrices.some((tier) => {
        return Number(tier.minQuantity || 0) <= 0 || Number(tier.price || 0) <= 0;
      })
    ) {
      Toast.show({ type: "error", text1: "Wholesale tier quantity and price must be greater than zero" });
      return;
    }

    try {
      await updateStockGroup.mutateAsync(editDraft);
      Toast.show({
        type: "success",
        text1: "Stock group updated",
        text2: `Group #${editDraft.groupId} was saved.`,
      });
      closeEdit();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: getErrorMessage(err, "Unable to update stock group"),
      });
    }
  };

  const confirmDelete = (group: StockGroup, item: StockItem) => {
    Alert.alert(
      "Delete stock variant",
      `Delete item #${item.itemId} (${item.sizing || "No size"}) from ${group.groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteStockItem.mutateAsync({ groupId: group.groupId, itemId: item.itemId });
                Toast.show({ type: "success", text1: "Variant deleted" });
              } catch (err) {
                Toast.show({
                  type: "error",
                  text1: "Delete failed",
                  text2: getErrorMessage(err, "Unable to delete variant"),
                });
              }
            })();
          },
        },
      ]
    );
  };

  const confirmDeleteGroup = (group: StockGroup) => {
    Alert.alert(
      "Delete stock group",
      `Delete entire group #${group.groupId} (${group.groupName}) with all variants?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteStockGroup.mutateAsync(group.groupId);
                Toast.show({ type: "success", text1: "Group deleted" });
              } catch (err) {
                Toast.show({
                  type: "error",
                  text1: "Group delete failed",
                  text2: getErrorMessage(err, "Unable to delete stock group"),
                });
              }
            })();
          },
        },
      ]
    );
  };

  const updateDraft = (patch: Partial<StockEditDraft>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateDraftItem = (itemId: number, patch: Partial<EditableStockItem>) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => (item.itemId === itemId ? { ...item, ...patch } : item)),
      };
    });
  };

  const addDraftTier = () => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wholesalePrices: [...prev.wholesalePrices, { minQuantity: 0, price: 0 }],
      };
    });
  };

  const updateDraftTier = (index: number, field: "minQuantity" | "price", value: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.wholesalePrices];
      const current = next[index];
      if (!current) return prev;
      next[index] = {
        ...current,
        [field]: value,
      };
      return {
        ...prev,
        wholesalePrices: next,
      };
    });
  };

  const removeDraftTier = (index: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wholesalePrices: prev.wholesalePrices.filter((_, i) => i !== index),
      };
    });
  };

  if (isLoading && !items.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading stocks..." variant="cards" />
      </Screen>
    );
  }

  if (error && !items.length) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to fetch stocks"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  const mutating = updateStockGroup.isPending || deleteStockItem.isPending || deleteStockGroup.isPending;

  return (
    <Screen>
      <SectionTitle
        title="Stock Inventory"
        subtitle={`${total} records`}
        right={
          <AppButton
            label="New Stock"
            variant="secondary"
            leftIcon={<MaterialCommunityIcons name="plus-circle-outline" size={15} color={theme.text} />}
            onPress={() => navigation.navigate("InventoryBulkEntry")}
            style={styles.primaryAction}
          />
        }
      />

      <Card style={styles.toolbarCard}>
        <View style={styles.toolbarTopRow}>
          <View style={styles.toolbarTitleWrap}>
            <Text style={[styles.toolbarTitle, { color: theme.text }]}>Inventory Overview</Text>
            <Text style={[styles.toolbarSubtitle, { color: theme.muted }]}>Review groups, variants, and stock levels.</Text>
          </View>
          <AppButton
            label="Refresh"
            variant="secondary"
            leftIcon={<MaterialCommunityIcons name="refresh" size={15} color={theme.text} />}
            onPress={() => void refresh()}
          />
        </View>

        <View style={styles.chipRow}>
          <View
            style={[
              styles.statChip,
              {
                borderColor: `${theme.primary}3C`,
                backgroundColor: `${theme.primary}12`,
              },
            ]}
          >
            <MaterialCommunityIcons name="view-grid-outline" size={13} color={theme.primary} />
            <Text style={[styles.statChipText, { color: theme.primary }]}>{pageStats.groups} groups</Text>
          </View>

          <View
            style={[
              styles.statChip,
              {
                borderColor: `${theme.accent}3C`,
                backgroundColor: `${theme.accent}12`,
              },
            ]}
          >
            <MaterialCommunityIcons name="palette-outline" size={13} color={theme.accent} />
            <Text style={[styles.statChipText, { color: theme.accent }]}>{pageStats.variants} variants</Text>
          </View>

          <View
            style={[
              styles.statChip,
              {
                borderColor: `${theme.success}3C`,
                backgroundColor: `${theme.success}12`,
              },
            ]}
          >
            <MaterialCommunityIcons name="archive-arrow-up-outline" size={13} color={theme.success} />
            <QuantityBadge value={pageStats.qty} suffix="units" tone="success" compact />
          </View>

          <View
            style={[
              styles.statChip,
              {
                borderColor: pageStats.low > 0 ? `${theme.warning}3C` : `${theme.success}3C`,
                backgroundColor: pageStats.low > 0 ? `${theme.warning}12` : `${theme.success}12`,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={pageStats.low > 0 ? "alert-outline" : "check-circle-outline"}
              size={13}
              color={pageStats.low > 0 ? theme.warning : theme.success}
            />
            <QuantityBadge
              value={pageStats.low}
              suffix="low stock"
              tone={pageStats.low > 0 ? "warning" : "success"}
              compact
            />
          </View>
        </View>

        <AppInput
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Search by group name, barcode, size, group id"
        />

        <View style={styles.actionsRow}>
          <AppButton
            label="Clear"
            variant="secondary"
            disabled={!search.trim()}
            onPress={() => {
              setSearch("");
              setPage(0);
            }}
            style={styles.flexInput}
          />
          <AppButton
            label="Create New Stock"
            onPress={() => navigation.navigate("InventoryBulkEntry")}
            style={styles.flexInput}
          />
        </View>
      </Card>

      {!items.length ? (
        <EmptyState title="No stocks found" subtitle="Adjust filters or create a new stock entry." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={items}
          keyExtractor={(item) => String(item.groupId)}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <InventoryStockCard
              group={item}
              selectedBase={selectedBase}
              displayMoney={displayMoney}
              mutating={mutating}
              onEdit={openEdit}
              onDeleteGroup={confirmDeleteGroup}
              onDeleteVariant={confirmDelete}
            />
          )}
        />
      )}

      <View style={styles.paginationWrap}>
        <AppButton
          label="Prev"
          variant="secondary"
          disabled={page <= 0}
          onPress={() => setPage((current) => Math.max(0, current - 1))}
          style={styles.pageButton}
        />

        <View style={[styles.pageBadgeWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.pageText, { color: theme.text }]}>{page + 1} / {totalPages}</Text>
        </View>

        <AppButton
          label="Next"
          variant="secondary"
          disabled={page + 1 >= totalPages}
          onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          style={styles.pageButton}
        />
      </View>

      <InventoryStockEditDrawer
        visible={Boolean(editDraft)}
        editDraft={editDraft}
        saving={updateStockGroup.isPending}
        onClose={closeEdit}
        onSave={onSaveEdit}
        updateDraft={updateDraft}
        updateDraftItem={updateDraftItem}
        addDraftTier={addDraftTier}
        updateDraftTier={updateDraftTier}
        removeDraftTier={removeDraftTier}
      />
    </Screen>
  );
}
