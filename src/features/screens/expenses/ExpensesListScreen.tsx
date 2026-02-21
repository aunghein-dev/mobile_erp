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
import { ListRow } from "@/shared/components/ui/ListRow";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { LoadingState, EmptyState, ErrorState } from "@/shared/components/ui/StateViews";
import { useExpenses } from "@/features/hooks/expenses/useExpenses";
import { useExpenseHeadings } from "@/features/hooks/expenses/useExpenseHeadings";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { formatDate, formatMoney } from "@/shared/lib/utils/format";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { Expense, ExpenseStatus, PaymentMethod } from "@/shared/types/expense";

type ExpenseFormState = {
  title: string;
  headingId: string;
  amount: string;
  currency: string;
  date: string;
  merchant: string;
  description: string;
};

type PaymentFormState = {
  method: PaymentMethod;
  amount: string;
  reference: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpenseForm(headingId = ""): ExpenseFormState {
  return {
    title: "",
    headingId,
    amount: "",
    currency: "MMK",
    date: todayIsoDate(),
    merchant: "",
    description: "",
  };
}

function paymentFormFromExpense(expense: Expense): PaymentFormState {
  return {
    method: "CASH",
    amount: String(expense.amount ?? 0),
    reference: "",
  };
}

function formFromExpense(expense: Expense): ExpenseFormState {
  return {
    title: expense.title || "",
    headingId: expense.headingId || "",
    amount: String(expense.amount ?? 0),
    currency: expense.currency || "MMK",
    date: expense.date?.slice(0, 10) || todayIsoDate(),
    merchant: expense.merchant || "",
    description: expense.description || "",
  };
}

export default function ExpensesListScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bizId = useBusinessStore((s) => s.bizId);
  const actor = useOfflineUserStore((s) => s.user?.username) ?? "system";
  const { expenses, isLoading, isError, refresh } = useExpenses();
  const { headings } = useExpenseHeadings();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "ALL">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [paymentExpense, setPaymentExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(() => defaultExpenseForm());
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    method: "CASH",
    amount: "",
    reference: "",
  });

  const headingMap = useMemo(() => {
    const map: Record<string, string> = {};
    headings.forEach((entry) => {
      map[entry.id] = entry.name;
    });
    return map;
  }, [headings]);

  const summary = useMemo(() => {
    return {
      requested: expenses.filter((entry) => entry.status === "REQUESTED").length,
      approved: expenses.filter((entry) => entry.status === "APPROVED").length,
      rejected: expenses.filter((entry) => entry.status === "REJECTED").length,
      paid: expenses.filter((entry) => entry.status === "PAID").length,
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return expenses.filter((entry) => {
      const byStatus = statusFilter === "ALL" || entry.status === statusFilter;
      if (!byStatus) return false;
      if (!keyword) return true;

      const headingLabel = headingMap[entry.headingId] || "";
      return (
        entry.title.toLowerCase().includes(keyword) ||
        entry.status.toLowerCase().includes(keyword) ||
        entry.requesterId.toLowerCase().includes(keyword) ||
        headingLabel.toLowerCase().includes(keyword)
      );
    });
  }, [expenses, headingMap, search, statusFilter]);

  const revalidateExpenseQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(bizId) });
  };

  const saveExpense = useMutation({
    mutationFn: async () => {
      if (!bizId) throw new Error("No business selected");
      const headingId = Number(form.headingId);
      if (!Number.isFinite(headingId) || headingId <= 0) {
        throw new Error("Heading is required");
      }

      const payload = {
        title: form.title.trim(),
        headingId,
        amount: Number(form.amount || 0),
        currency: form.currency.trim().toUpperCase(),
        date: form.date.trim().slice(0, 10),
        merchant: form.merchant.trim() || null,
        description: form.description.trim() || null,
      };

      if (!payload.headingId) throw new Error("Heading is required");
      if (!payload.title) throw new Error("Title is required");
      if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }

      if (editingExpense) {
        await api.put(
          routes.expense.update(bizId, editingExpense.id),
          {
            ...payload,
            updatedBy: actor,
          },
          {
            withCredentials: true,
            headers: { "X-Actor": actor },
          }
        );
        return "updated";
      }

      await api.post(
        routes.expense.list(bizId),
        {
          businessId: bizId,
          ...payload,
          requesterId: actor,
        },
        {
          withCredentials: true,
          headers: { "X-Actor": actor },
        }
      );

      return "created";
    },
    onSuccess: async () => {
      await revalidateExpenseQueries();
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!bizId) throw new Error("No business selected");
      await api.delete(routes.expense.remove(bizId, expenseId), {
        withCredentials: true,
        headers: { "X-Actor": actor },
      });
    },
    onSuccess: async () => {
      await revalidateExpenseQueries();
    },
  });

  const decision = useMutation({
    mutationFn: async (payload: { expenseId: string; action: "APPROVE" | "REJECT" }) => {
      if (!bizId) throw new Error("No business selected");
      const path =
        payload.action === "APPROVE"
          ? routes.expense.approve(bizId, payload.expenseId)
          : routes.expense.reject(bizId, payload.expenseId);

      await api.post(
        path,
        {
          managerId: actor,
          note: null,
          actorUser: actor,
        },
        {
          withCredentials: true,
          headers: { "X-Actor": actor },
        }
      );
    },
    onSuccess: async () => {
      await revalidateExpenseQueries();
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!bizId) throw new Error("No business selected");

      const amount = Number(paymentForm.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      await api.post(
        routes.expense.transaction(bizId, expenseId),
        {
          method: paymentForm.method,
          paidAt: new Date().toISOString(),
          reference: paymentForm.reference.trim() || null,
          amount,
          attachmentUrl: null,
          actorUser: actor,
        },
        {
          withCredentials: true,
          headers: { "X-Actor": actor },
        }
      );
    },
    onSuccess: async () => {
      await revalidateExpenseQueries();
    },
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditingExpense(null);
    setForm(defaultExpenseForm(headings[0]?.id || ""));
  };

  const openCreate = () => {
    setEditingExpense(null);
    setForm(defaultExpenseForm(headings[0]?.id || ""));
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm(formFromExpense(expense));
    setFormOpen(true);
  };

  const openPay = (expense: Expense) => {
    setPaymentExpense(expense);
    setPaymentForm(paymentFormFromExpense(expense));
    setPaymentOpen(true);
  };

  const closePay = () => {
    setPaymentOpen(false);
    setPaymentExpense(null);
    setPaymentForm({ method: "CASH", amount: "", reference: "" });
  };

  const onSave = async () => {
    try {
      const action = await saveExpense.mutateAsync();
      Toast.show({
        type: "success",
        text1: action === "updated" ? "Expense updated" : "Expense created",
      });
      closeForm();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: getErrorMessage(error, "Unable to save expense"),
      });
    }
  };

  const onDelete = (expense: Expense) => {
    Alert.alert("Delete expense", `Delete ${expense.title}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteExpense.mutateAsync(expense.id);
              Toast.show({ type: "success", text1: "Expense deleted" });
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: getErrorMessage(error, "Unable to delete expense"),
              });
            }
          })();
        },
      },
    ]);
  };

  const onDecision = async (expense: Expense, action: "APPROVE" | "REJECT") => {
    try {
      await decision.mutateAsync({ expenseId: expense.id, action });
      Toast.show({
        type: "success",
        text1: action === "APPROVE" ? "Expense approved" : "Expense rejected",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Action failed",
        text2: getErrorMessage(error, "Unable to update approval"),
      });
    }
  };

  const onPayNow = async () => {
    if (!paymentExpense) return;
    try {
      await recordPayment.mutateAsync(paymentExpense.id);
      Toast.show({ type: "success", text1: "Expense marked as paid" });
      closePay();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Payment failed",
        text2: getErrorMessage(error, "Unable to record expense payment"),
      });
    }
  };

  if (isLoading && !expenses.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading expenses..." variant="cards" />
      </Screen>
    );
  }

  if (isError && !expenses.length) {
    return (
      <Screen scroll={false}>
        <ErrorState title="Unable to fetch expenses" onRetry={() => void refresh()} />
      </Screen>
    );
  }

  const mutating =
    saveExpense.isPending ||
    deleteExpense.isPending ||
    decision.isPending ||
    recordPayment.isPending;

  return (
    <Screen>
      <SectionTitle
        title="Expense Requests"
        subtitle={`${expenses.length} records`}
        right={<AppButton label="New Expense" variant="secondary" onPress={openCreate} />}
      />

      <View style={styles.metricsRow}>
        <MetricCard label="Requested" value={String(summary.requested)} tone="blue" />
        <MetricCard label="Approved" value={String(summary.approved)} tone="green" />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard label="Rejected" value={String(summary.rejected)} tone="rose" />
        <MetricCard label="Paid" value={String(summary.paid)} tone="teal" />
      </View>

      <AppInput value={search} onChangeText={setSearch} placeholder="Search by title, requester, status" />

      <View style={styles.statusRow}>
        {(["ALL", "REQUESTED", "APPROVED", "REJECTED", "PAID"] as const).map((status) => {
          const active = statusFilter === status;
          return (
            <AppPressable
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[
                styles.statusChip,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}14` : theme.cardSoft,
                },
              ]}
            >
              <Text style={{ color: active ? theme.primary : theme.text, fontSize: 11, fontWeight: "700" }}>
                {status}
              </Text>
            </AppPressable>
          );
        })}
      </View>

      {!filtered.length ? (
        <EmptyState title="No expenses found" subtitle="Try another keyword or create a new expense." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={filtered}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <ListRow
              title={item.title}
              subtitle={`${headingMap[item.headingId] || `Heading #${item.headingId}`} • ${item.status}`}
              right={formatMoney(item.amount, item.currency)}
              footer={`${formatDate(item.date)} • ${item.requesterId}`}
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
                ...(item.status === "REQUESTED"
                  ? [
                      {
                        key: "reject",
                        label: "Reject",
                        tone: "danger" as const,
                        onPress: () => void onDecision(item, "REJECT"),
                        disabled: mutating,
                      },
                      {
                        key: "approve",
                        label: "Approve",
                        tone: "primary" as const,
                        onPress: () => void onDecision(item, "APPROVE"),
                        disabled: mutating,
                      },
                    ]
                  : []),
                ...(item.status === "APPROVED"
                  ? [
                      {
                        key: "pay",
                        label: "Record Payment",
                        tone: "primary" as const,
                        onPress: () => openPay(item),
                        disabled: mutating,
                      },
                    ]
                  : []),
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
          <SectionTitle title={editingExpense ? "Edit Expense" : "New Expense"} />

          <AppInput
            label="Title"
            value={form.title}
            onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          />

          <View style={styles.headingRow}>
            {headings.map((heading) => {
              const active = form.headingId === heading.id;
              return (
                <AppPressable
                  key={heading.id}
                  onPress={() => setForm((prev) => ({ ...prev, headingId: heading.id }))}
                  style={[
                    styles.headingChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? `${theme.primary}14` : theme.cardSoft,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={{ color: active ? theme.primary : theme.text, fontSize: 11, fontWeight: "700" }}
                  >
                    {heading.name}
                  </Text>
                </AppPressable>
              );
            })}
          </View>

          <AppInput
            label="Heading ID"
            value={form.headingId}
            onChangeText={(headingId) => setForm((prev) => ({ ...prev, headingId }))}
            helperText="Choose heading from chips above or enter ID manually"
          />

          <View style={styles.row2}>
            <AppInput
              label="Amount"
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))}
              style={styles.flexInput}
            />
            <AppInput
              label="Currency"
              value={form.currency}
              onChangeText={(currency) => setForm((prev) => ({ ...prev, currency }))}
              style={styles.flexInput}
            />
          </View>

          <AppInput
            label="Date"
            value={form.date}
            onChangeText={(date) => setForm((prev) => ({ ...prev, date }))}
            helperText="YYYY-MM-DD"
          />

          <AppInput
            label="Merchant"
            value={form.merchant}
            onChangeText={(merchant) => setForm((prev) => ({ ...prev, merchant }))}
          />

          <AppInput
            label="Description"
            value={form.description}
            onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actionsRow}>
            <AppButton label="Cancel" variant="secondary" onPress={closeForm} style={styles.flexInput} />
            <AppButton
              label={saveExpense.isPending ? "Saving..." : editingExpense ? "Update" : "Create"}
              onPress={onSave}
              loading={saveExpense.isPending}
              style={styles.flexInput}
            />
          </View>
        </ScrollView>
      </DrawerSheet>

      <DrawerSheet
        visible={paymentOpen}
        onClose={closePay}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title="Record Payment" subtitle={paymentExpense?.title || ""} />

          <View style={styles.paymentRow}>
            {([
              { key: "CASH", label: "Cash" },
              { key: "BANK_TRANSFER", label: "Bank" },
              { key: "CARD", label: "Card" },
              { key: "OTHER", label: "Other" },
            ] as const).map((entry) => {
              const active = paymentForm.method === entry.key;
              return (
                <AppPressable
                  key={entry.key}
                  onPress={() => setPaymentForm((prev) => ({ ...prev, method: entry.key }))}
                  style={[
                    styles.paymentChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? `${theme.primary}14` : theme.cardSoft,
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.primary : theme.text, fontSize: 11, fontWeight: "700" }}>
                    {entry.label}
                  </Text>
                </AppPressable>
              );
            })}
          </View>

          <AppInput
            label="Amount"
            keyboardType="decimal-pad"
            value={paymentForm.amount}
            onChangeText={(amount) => setPaymentForm((prev) => ({ ...prev, amount }))}
          />

          <AppInput
            label="Reference"
            value={paymentForm.reference}
            onChangeText={(reference) => setPaymentForm((prev) => ({ ...prev, reference }))}
            helperText="Optional payment reference"
          />

          <View style={styles.actionsRow}>
            <AppButton label="Cancel" variant="secondary" onPress={closePay} style={styles.flexInput} />
            <AppButton
              label={recordPayment.isPending ? "Saving..." : "Mark Paid"}
              onPress={onPayNow}
              loading={recordPayment.isPending}
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  headingChip: {
    maxWidth: "48%",
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
