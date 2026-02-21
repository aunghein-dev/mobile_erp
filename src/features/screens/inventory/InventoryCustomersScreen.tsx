import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { DrawerSheet } from "@/shared/components/ui/DrawerSheet";
import { LoadingState, EmptyState, ErrorState } from "@/shared/components/ui/StateViews";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { ListRow } from "@/shared/components/ui/ListRow";
import { useCustomer, useCustomerDashboard } from "@/features/hooks/inventory/useCustomer";
import { formatMoney } from "@/shared/lib/utils/format";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { routes } from "@/shared/lib/api/routes";
import { appendJsonPart } from "@/shared/lib/api/formData";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { Customer } from "@/shared/types/customer";

type ModalMode = "create" | "edit" | null;

type CustomerFormState = {
  imgUrl: string;
  name: string;
  typeOfCustomer: string;
  phoneNo1: string;
  phoneNo2: string;
  township: string;
  city: string;
  address1: string;
  customerDueAmt: string;
  customerLastDueDate: string;
};

const CUSTOMER_TYPES = ["Retailer", "Wholesaler", "Distributor", "Individual", "Other"];

function emptyForm(): CustomerFormState {
  return {
    imgUrl: "",
    name: "",
    typeOfCustomer: "",
    phoneNo1: "",
    phoneNo2: "",
    township: "",
    city: "",
    address1: "",
    customerDueAmt: "0",
    customerLastDueDate: "",
  };
}

function formFromCustomer(customer: Customer): CustomerFormState {
  return {
    imgUrl: customer.imgUrl || "",
    name: customer.name || "",
    typeOfCustomer: customer.typeOfCustomer || "Retailer",
    phoneNo1: customer.phoneNo1 || "",
    phoneNo2: customer.phoneNo2 || "",
    township: customer.township || "",
    city: customer.city || "",
    address1: customer.address1 || "",
    customerDueAmt: String(customer.customerDueAmt ?? 0),
    customerLastDueDate: customer.customerLastDueDate?.slice(0, 10) || "",
  };
}

async function buildCustomerMultipartFormData(params: {
  payload: Record<string, unknown>;
  imageUri: string | null;
  imageType: string;
  imageName: string;
}) {
  const formData = new FormData();
  let tempJsonUri: string | null = null;

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      tempJsonUri = `${cacheDir}customer-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
      await FileSystem.writeAsStringAsync(tempJsonUri, JSON.stringify(params.payload), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      formData.append("customer", {
        uri: tempJsonUri,
        name: "customer.json",
        type: "application/json",
      } as unknown as Blob);
    } else {
      appendJsonPart(formData, "customer", params.payload);
    }
  } catch {
    appendJsonPart(formData, "customer", params.payload);
  }

  if (params.imageUri) {
    formData.append("image", {
      uri: params.imageUri,
      name: params.imageName || `customer-${Date.now()}.jpg`,
      type: params.imageType,
    } as unknown as Blob);
  }

  return {
    formData,
    cleanup: async () => {
      if (!tempJsonUri) return;
      try {
        await FileSystem.deleteAsync(tempJsonUri, { idempotent: true });
      } catch {}
    },
  };
}

export default function InventoryCustomersScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bizId = useBusinessStore((s) => s.bizId);
  const { customers, isLoading, error, refresh } = useCustomer();
  const { dashboard } = useCustomerDashboard();

  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm());
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<string>("image/jpeg");
  const [selectedImageName, setSelectedImageName] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const keyword = search.trim().toLowerCase();
    return customers.filter((entry) => {
      return (
        entry.name.toLowerCase().includes(keyword) ||
        entry.typeOfCustomer.toLowerCase().includes(keyword) ||
        entry.cid.toLowerCase().includes(keyword) ||
        entry.phoneNo1.toLowerCase().includes(keyword)
      );
    });
  }, [customers, search]);

  const revalidateCustomerQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.customers(bizId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.customerDashboard(bizId) });
  };

  const saveCustomer = useMutation({
    mutationFn: async () => {
      if (!bizId) throw new Error("No business selected");
      const isEdit = modalMode === "edit" && editingCustomer;
      if (isEdit && !editingCustomer.cid?.trim()) {
        throw new Error("Customer identifier is missing");
      }

      const payload = {
        ...(isEdit ? { rowId: editingCustomer.rowId } : {}),
        address1: form.address1.trim(),
        bizId,
        boughtAmt: isEdit ? editingCustomer.boughtAmt : 0,
        boughtCnt: isEdit ? editingCustomer.boughtCnt : 0,
        cid: isEdit ? editingCustomer.cid : `${bizId}-${dayjs().format("YYMMDDHHmmssSSS")}`,
        city: form.city.trim(),
        customerDueAmt: isEdit ? Number(form.customerDueAmt || 0) : 0,
        customerLastDueDate: isEdit ? form.customerLastDueDate.trim() || null : null,
        lastShopDate: isEdit ? editingCustomer.lastShopDate ?? null : null,
        name: form.name.trim(),
        phoneNo1: form.phoneNo1.trim(),
        phoneNo2: form.phoneNo2.trim(),
        township: form.township.trim(),
        typeOfCustomer: form.typeOfCustomer.trim(),
        imgUrl: isEdit ? editingCustomer.imgUrl ?? null : null,
      };

      const { formData, cleanup } = await buildCustomerMultipartFormData({
        payload,
        imageUri: selectedImageUri,
        imageType: selectedImageType,
        imageName: selectedImageName,
      });

      try {
        if (isEdit) {
          await api.put(routes.inventory.updateCustomer(bizId), formData, {
            withCredentials: true,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          return "updated";
        }

        await api.post(routes.inventory.createCustomer(bizId), formData, {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return "created";
      } finally {
        await cleanup();
      }
    },
    onSuccess: async () => {
      await revalidateCustomerQueries();
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (customer: Customer) => {
      await api.delete(routes.inventory.deleteCustomer(customer.bizId, customer.cid), {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await revalidateCustomerQueries();
    },
  });

  const closeModal = () => {
    setModalMode(null);
    setEditingCustomer(null);
    setForm(emptyForm());
    setShowTypeDropdown(false);
    setSelectedImageUri(null);
    setSelectedImageType("image/jpeg");
    setSelectedImageName("");
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(emptyForm());
    setModalMode("create");
    setShowTypeDropdown(false);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm(formFromCustomer(customer));
    setModalMode("edit");
    setShowTypeDropdown(false);
    setSelectedImageUri(null);
    setSelectedImageType("image/jpeg");
    setSelectedImageName("");
  };

  const pickCustomerImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission required",
        text2: "Photo library access is needed for customer image upload.",
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
    if (fileSize > 10 * 1024 * 1024) {
      Toast.show({
        type: "error",
        text1: "Image too large",
        text2: "Please choose an image smaller than 10MB.",
      });
      return;
    }

    setSelectedImageUri(asset.uri);
    setSelectedImageType(asset.mimeType || "image/jpeg");
    setSelectedImageName(asset.fileName || `customer-${Date.now()}.jpg`);
  };

  const onSave = async () => {
    const primaryPhone = form.phoneNo1.trim();
    const secondaryPhone = form.phoneNo2.trim();

    if (!form.name.trim() || !form.typeOfCustomer.trim() || !primaryPhone) {
      Toast.show({
        type: "error",
        text1: "Missing required fields",
        text2: "Name, customer type, and primary phone are required.",
      });
      return;
    }
    if (!/^\d{7,15}$/.test(primaryPhone)) {
      Toast.show({
        type: "error",
        text1: "Invalid phone number",
        text2: "Primary phone must be 7 to 15 digits.",
      });
      return;
    }
    if (secondaryPhone && !/^\d{7,15}$/.test(secondaryPhone)) {
      Toast.show({
        type: "error",
        text1: "Invalid phone number",
        text2: "Secondary phone must be 7 to 15 digits.",
      });
      return;
    }

    try {
      const action = await saveCustomer.mutateAsync();
      Toast.show({
        type: "success",
        text1: action === "updated" ? "Customer updated" : "Customer created",
      });
      closeModal();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: getErrorMessage(err, "Unable to save customer"),
      });
    }
  };

  const onDelete = (customer: Customer) => {
    Alert.alert("Delete customer", `Delete ${customer.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteCustomer.mutateAsync(customer);
              Toast.show({ type: "success", text1: "Customer deleted" });
            } catch (err) {
              Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: getErrorMessage(err, "Unable to delete customer"),
              });
            }
          })();
        },
      },
    ]);
  };

  if (isLoading && !customers.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading customers..." variant="cards" />
      </Screen>
    );
  }

  if (error && !customers.length) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to fetch customers"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  const isSubmitting = saveCustomer.isPending || deleteCustomer.isPending;
  const previewCustomerImage = selectedImageUri || form.imgUrl || "";

  return (
    <Screen>
      <SectionTitle
        title="Customers"
        subtitle={`${customers.length} total`}
        right={<AppButton label="New Customer" variant="secondary" onPress={openCreate} />}
      />

      <View style={styles.metricsRow}>
        <MetricCard
          label="Retailers"
          value={String(dashboard?.retailerCnt ?? 0)}
          tone="blue"
          icon={<MaterialCommunityIcons name="storefront-outline" size={15} color="#0B6CD8" />}
        />
        <MetricCard
          label="Wholesalers"
          value={String(dashboard?.wholesalerCnt ?? 0)}
          tone="orange"
          icon={<MaterialCommunityIcons name="warehouse" size={15} color="#B67215" />}
        />
      </View>

      <MetricCard
        label="Total Due"
        value={formatMoney(dashboard?.totalDue ?? 0)}
        tone="rose"
        icon={<MaterialCommunityIcons name="cash-clock" size={15} color="#C9363E" />}
      />

      <AppInput value={search} onChangeText={setSearch} placeholder="Search by name, CID, phone, type" />

      {!filtered.length ? (
        <EmptyState title="No customers found" subtitle="Try another search or add a new customer." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={filtered}
          keyExtractor={(item) => String(item.rowId)}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={`${item.typeOfCustomer} • ${item.phoneNo1}`}
              right={item.cid}
              footer={`Due ${formatMoney(item.customerDueAmt)} • ${item.city || "-"} ${item.township || ""}`}
              actions={[
                {
                  key: "edit",
                  label: "Edit",
                  tone: "primary",
                  onPress: () => openEdit(item),
                  disabled: isSubmitting,
                },
                {
                  key: "delete",
                  label: "Delete",
                  tone: "danger",
                  onPress: () => onDelete(item),
                  disabled: isSubmitting,
                },
              ]}
            />
          )}
        />
      )}

      <DrawerSheet
        visible={modalMode !== null}
        onClose={closeModal}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setShowTypeDropdown(false)}
        >
          <SectionTitle title={modalMode === "edit" ? "Edit Customer" : "New Customer"} />

          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Select customer image"
            accessibilityHint="Opens your photo library to select a customer profile image"
            style={[
              styles.imagePicker,
              {
                borderColor: theme.border,
                backgroundColor: theme.cardSoft,
              },
            ]}
            onPress={() => void pickCustomerImage()}
          >
            {previewCustomerImage ? (
              <Image source={{ uri: previewCustomerImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="account-circle-outline" size={22} color={theme.muted} />
                <Text style={[styles.imagePlaceholderText, { color: theme.muted }]}>Tap to select customer image</Text>
              </View>
            )}
          </AppPressable>

          <AppInput
            label="Name"
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          />

          <View style={styles.dropdownWrap}>
            <Text style={[styles.dropdownLabel, { color: theme.text }]}>Customer Type</Text>
            <AppPressable
              style={[
                styles.dropdownField,
                {
                  borderColor: showTypeDropdown ? theme.primary : theme.border,
                  backgroundColor: theme.card,
                },
              ]}
              onPress={() => setShowTypeDropdown((prev) => !prev)}
            >
              <View style={styles.dropdownValueWrap}>
                <MaterialCommunityIcons name="tag-outline" size={16} color={form.typeOfCustomer ? theme.primary : theme.muted} />
                <Text
                  style={[
                    styles.dropdownValue,
                    { color: form.typeOfCustomer ? theme.text : theme.muted },
                  ]}
                >
                  {form.typeOfCustomer || "Select customer type"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={showTypeDropdown ? "chevron-up" : "chevron-down"}
                size={17}
                color={theme.muted}
              />
            </AppPressable>
            {showTypeDropdown ? (
              <View style={[styles.dropdownMenu, { borderColor: theme.border, backgroundColor: theme.card }]}>
                {CUSTOMER_TYPES.map((type) => {
                  const selected = form.typeOfCustomer === type;
                  return (
                    <AppPressable
                      key={type}
                      style={[
                        styles.dropdownOption,
                        {
                          backgroundColor: selected ? `${theme.primary}12` : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setForm((prev) => ({ ...prev, typeOfCustomer: type }));
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          { color: selected ? theme.primary : theme.text },
                        ]}
                      >
                        {type}
                      </Text>
                      {selected ? (
                        <MaterialCommunityIcons name="check" size={15} color={theme.primary} />
                      ) : null}
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.row2}>
            <AppInput
              label="Primary Phone"
              keyboardType="phone-pad"
              value={form.phoneNo1}
              onChangeText={(phoneNo1) => setForm((prev) => ({ ...prev, phoneNo1 }))}
              style={styles.flexInput}
            />
            <AppInput
              label="Secondary Phone"
              keyboardType="phone-pad"
              value={form.phoneNo2}
              onChangeText={(phoneNo2) => setForm((prev) => ({ ...prev, phoneNo2 }))}
              style={styles.flexInput}
            />
          </View>

          <View style={styles.row2}>
            <AppInput
              label="Township"
              value={form.township}
              onChangeText={(township) => setForm((prev) => ({ ...prev, township }))}
              style={styles.flexInput}
            />
            <AppInput
              label="City"
              value={form.city}
              onChangeText={(city) => setForm((prev) => ({ ...prev, city }))}
              style={styles.flexInput}
            />
          </View>

          <AppInput
            label="Address"
            value={form.address1}
            onChangeText={(address1) => setForm((prev) => ({ ...prev, address1 }))}
            multiline
            numberOfLines={2}
            inputStyle={styles.addressInput}
          />

          {modalMode === "edit" ? (
            <View style={styles.row2}>
              <AppInput
                label="Due Amount"
                keyboardType="decimal-pad"
                value={form.customerDueAmt}
                onChangeText={(customerDueAmt) => setForm((prev) => ({ ...prev, customerDueAmt }))}
                style={styles.flexInput}
              />
              <AppInput
                label="Last Due Date"
                value={form.customerLastDueDate}
                onChangeText={(customerLastDueDate) => setForm((prev) => ({ ...prev, customerLastDueDate }))}
                placeholder="YYYY-MM-DD"
                style={styles.flexInput}
              />
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={closeModal}
              style={styles.flexInput}
            />
            <AppButton
              label={saveCustomer.isPending ? "Saving..." : modalMode === "edit" ? "Update" : "Create"}
              onPress={onSave}
              loading={saveCustomer.isPending}
              style={styles.flexInput}
            />
          </View>
        </ScrollView>
      </DrawerSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  listWrap: {
    gap: 10,
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
  modalScroll: {
    maxHeight: "100%",
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 10,
  },
  imagePicker: {
    minHeight: 124,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: 124,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  imagePlaceholderText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dropdownWrap: {
    gap: 6,
    zIndex: 20,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  dropdownField: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    overflow: "hidden",
  },
  dropdownOption: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  addressInput: {
    minHeight: 88,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  flexInput: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
