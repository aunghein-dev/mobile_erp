import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { DrawerSheet } from "@/shared/components/ui/DrawerSheet";
import { EmptyState, LoadingState } from "@/shared/components/ui/StateViews";
import { ListRow } from "@/shared/components/ui/ListRow";
import { useExpenseHeadings } from "@/features/hooks/expenses/useExpenseHeadings";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { ExpenseHeading } from "@/shared/types/expense";

type HeadingFormState = {
  name: string;
  code: string;
  glAccount: string;
  taxTreatment: "INCLUSIVE" | "EXCLUSIVE" | "NA";
  perTxnLimit: string;
  dailyLimit: string;
  notes: string;
  isActive: boolean;
};

function createEmptyForm(): HeadingFormState {
  return {
    name: "",
    code: "",
    glAccount: "",
    taxTreatment: "NA",
    perTxnLimit: "",
    dailyLimit: "",
    notes: "",
    isActive: true,
  };
}

function formFromHeading(heading: ExpenseHeading): HeadingFormState {
  return {
    name: heading.name || "",
    code: heading.code || "",
    glAccount: heading.glAccount || "",
    taxTreatment: heading.taxTreatment || "NA",
    perTxnLimit: heading.perTxnLimit == null ? "" : String(heading.perTxnLimit),
    dailyLimit: heading.dailyLimit == null ? "" : String(heading.dailyLimit),
    notes: heading.notes || "",
    isActive: heading.isActive,
  };
}

export default function ExpensesHeadingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bizId = useBusinessStore((s) => s.bizId);
  const actor = useOfflineUserStore((s) => s.user?.username) ?? "system";
  const { headings, isLoading } = useExpenseHeadings();

  const [query, setQuery] = useState("");
  const [editingHeading, setEditingHeading] = useState<ExpenseHeading | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<HeadingFormState>(createEmptyForm());

  const filtered = useMemo(() => {
    if (!query.trim()) return headings;
    const keyword = query.trim().toLowerCase();
    return headings.filter((item) => {
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        (item.glAccount || "").toLowerCase().includes(keyword)
      );
    });
  }, [headings, query]);

  const refreshHeadings = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.expenseHeadings(bizId) });
  };

  const saveHeading = useMutation({
    mutationFn: async () => {
      if (!bizId) throw new Error("No business selected");
      const perTxnLimitRaw = form.perTxnLimit.trim();
      const dailyLimitRaw = form.dailyLimit.trim();
      const perTxnLimit = perTxnLimitRaw ? Number.parseInt(perTxnLimitRaw, 10) : null;
      const dailyLimit = dailyLimitRaw ? Number.parseInt(dailyLimitRaw, 10) : null;
      if (perTxnLimitRaw && (perTxnLimit === null || !Number.isFinite(perTxnLimit) || perTxnLimit < 0)) {
        throw new Error("Per-transaction limit must be a positive whole number");
      }
      if (dailyLimitRaw && (dailyLimit === null || !Number.isFinite(dailyLimit) || dailyLimit < 0)) {
        throw new Error("Daily limit must be a positive whole number");
      }

      const rowId = editingHeading?.id ? Number(editingHeading.id) : null;
      const payload = {
        ...(rowId !== null ? { rowId } : {}),
        businessId: bizId,
        expenseName: form.name.trim(),
        expenseCode: form.code.trim().toUpperCase(),
        isActive: form.isActive,
        taxTreatment: form.taxTreatment || "NA",
        perTxnLimit,
        dailyLimit,
        note: form.notes.trim() || null,
        updatedUser: actor,
      };

      await api.post(routes.expense.upsertHeading, payload, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await refreshHeadings();
    },
  });

  const deleteHeading = useMutation({
    mutationFn: async (heading: ExpenseHeading) => {
      if (!bizId) throw new Error("No business selected");
      const payload = {
        rowId: Number(heading.id),
        businessId: bizId,
        expenseName: heading.name.trim(),
        expenseCode: heading.code.trim().toUpperCase(),
        isActive: false,
        taxTreatment: heading.taxTreatment || "NA",
        perTxnLimit: heading.perTxnLimit ?? null,
        dailyLimit: heading.dailyLimit ?? null,
        note: heading.notes?.trim() || null,
        updatedUser: actor,
      };
      await api.post(routes.expense.upsertHeading, payload, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await refreshHeadings();
    },
  });

  const openCreate = () => {
    setEditingHeading(null);
    setForm(createEmptyForm());
    setFormOpen(true);
  };

  const openEdit = (heading: ExpenseHeading) => {
    setEditingHeading(heading);
    setForm(formFromHeading(heading));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingHeading(null);
    setForm(createEmptyForm());
  };

  const onSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      Toast.show({
        type: "error",
        text1: "Name and code are required",
      });
      return;
    }

    try {
      await saveHeading.mutateAsync();
      Toast.show({
        type: "success",
        text1: editingHeading ? "Heading updated" : "Heading created",
      });
      closeForm();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: getErrorMessage(err, "Unable to save heading"),
      });
    }
  };

  const onDelete = (heading: ExpenseHeading) => {
    Alert.alert("Delete heading", `Delete ${heading.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteHeading.mutateAsync(heading);
              Toast.show({ type: "success", text1: "Heading deleted" });
            } catch (err) {
              Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: getErrorMessage(err, "Unable to delete heading"),
              });
            }
          })();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading expense headings..." variant="list" />
      </Screen>
    );
  }

  const mutating = saveHeading.isPending || deleteHeading.isPending;

  return (
    <Screen>
      <SectionTitle
        title="Expense Headings"
        subtitle={`${headings.length} configured`}
        right={<AppButton label="New Heading" variant="secondary" onPress={openCreate} />}
      />

      <AppInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by heading name, code, or GL account"
      />

      {!filtered.length ? (
        <EmptyState title="No headings" subtitle="Create the first heading to start expense tagging." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={filtered}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={`${item.code} • Tax ${item.taxTreatment || "NA"}`}
              right={
                <View
                  style={[
                    styles.statusChip,
                    {
                      borderColor: item.isActive ? theme.success : theme.warning,
                      backgroundColor: item.isActive ? `${theme.success}12` : `${theme.warning}12`,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: item.isActive ? theme.success : theme.warning,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              }
              footer={[
                item.glAccount ? `GL ${item.glAccount}` : null,
                item.perTxnLimit != null ? `Txn ${item.perTxnLimit}` : null,
                item.dailyLimit != null ? `Daily ${item.dailyLimit}` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              actions={[
                {
                  key: "edit",
                  label: "Edit",
                  tone: "primary",
                  onPress: () => openEdit(item),
                  disabled: mutating,
                },
                {
                  key: "delete",
                  label: "Delete",
                  tone: "danger",
                  onPress: () => onDelete(item),
                  disabled: mutating,
                },
              ]}
            />
          )}
        />
      )}

      <DrawerSheet
        visible={formOpen}
        onClose={closeForm}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title={editingHeading ? "Edit Heading" : "New Heading"} />

                <AppInput
                  label="Heading Name"
                  value={form.name}
                  onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
                />
                <AppInput
                  label="Heading Code"
                  value={form.code}
                  onChangeText={(code) => setForm((prev) => ({ ...prev, code: code.toUpperCase() }))}
                />
                <AppInput
                  label="GL Account"
                  value={form.glAccount}
                  onChangeText={(glAccount) => setForm((prev) => ({ ...prev, glAccount }))}
                />

                <View style={styles.taxRow}>
                  {(["NA", "INCLUSIVE", "EXCLUSIVE"] as const).map((tax) => {
                    const active = form.taxTreatment === tax;
                    return (
                      <AppPressable
                        key={tax}
                        style={[
                          styles.taxChip,
                          {
                            borderColor: active ? theme.primary : theme.border,
                            backgroundColor: active ? `${theme.primary}14` : theme.cardSoft,
                          },
                        ]}
                        onPress={() => setForm((prev) => ({ ...prev, taxTreatment: tax }))}
                      >
                        <Text
                          style={{ color: active ? theme.primary : theme.text, fontSize: 11, fontWeight: "700" }}
                        >
                          {tax}
                        </Text>
                      </AppPressable>
                    );
                  })}
                </View>

                <View style={styles.row2}>
                  <AppInput
                    label="Per Transaction Limit"
                    keyboardType="decimal-pad"
                    value={form.perTxnLimit}
                    onChangeText={(perTxnLimit) => setForm((prev) => ({ ...prev, perTxnLimit }))}
                    style={styles.flexInput}
                  />
                  <AppInput
                    label="Daily Limit"
                    keyboardType="decimal-pad"
                    value={form.dailyLimit}
                    onChangeText={(dailyLimit) => setForm((prev) => ({ ...prev, dailyLimit }))}
                    style={styles.flexInput}
                  />
                </View>

                <AppInput
                  label="Notes"
                  value={form.notes}
                  onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
                  multiline
                  numberOfLines={3}
                />

                <AppPressable
                  style={styles.activeSwitch}
                  onPress={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                >
                  <View
                    style={[
                      styles.checkBox,
                      {
                        borderColor: form.isActive ? theme.success : theme.border,
                        backgroundColor: form.isActive ? `${theme.success}14` : "transparent",
                      },
                    ]}
                  >
                    {form.isActive ? (
                      <Text style={{ color: theme.success, fontWeight: "700", fontSize: 10 }}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600" }}>
                    {form.isActive ? "Active heading" : "Inactive heading"}
                  </Text>
                </AppPressable>

          <View style={styles.actionsRow}>
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={closeForm}
              style={styles.flexInput}
            />
            <AppButton
              label={saveHeading.isPending ? "Saving..." : editingHeading ? "Update" : "Create"}
              onPress={onSave}
              loading={saveHeading.isPending}
              style={styles.flexInput}
            />
          </View>
        </ScrollView>
      </DrawerSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    gap: 10,
  },
  statusChip: {
    minHeight: 24,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 26, 42, 0.35)",
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
  taxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  taxChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  activeSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
