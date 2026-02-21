import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { AppButton } from "@/shared/components/ui/AppButton";
import { LoadingState, EmptyState } from "@/shared/components/ui/StateViews";
import { useExpenses } from "@/features/hooks/expenses/useExpenses";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { formatDate, formatMoney } from "@/shared/lib/utils/format";
import { Text } from "react-native";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";

export default function ExpensesApprovalsScreen() {
  const queryClient = useQueryClient();
  const bizId = useBusinessStore((s) => s.bizId);
  const actor = useOfflineUserStore((s) => s.user?.username) ?? "system";
  const { expenses, isLoading } = useExpenses();

  const pending = useMemo(
    () => expenses.filter((entry) => entry.status === "REQUESTED"),
    [expenses]
  );

  const decision = useMutation({
    mutationFn: async (payload: { id: string; decision: "APPROVE" | "REJECT" }) => {
      if (!bizId) throw new Error("No business selected");
      const path =
        payload.decision === "APPROVE"
          ? routes.expense.approve(bizId, payload.id)
          : routes.expense.reject(bizId, payload.id);

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(bizId) });
    },
  });

  const onDecision = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      await decision.mutateAsync({ id, decision: action });
      Toast.show({
        type: "success",
        text1: action === "APPROVE" ? "Approved" : "Rejected",
        text2: `Expense ${id} updated`,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Action failed",
        text2: getErrorMessage(error, "Unable to update expense status"),
      });
    }
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading approvals..." variant="cards" />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle title="Manager Approvals" subtitle={`${pending.length} pending`} />

      {!pending.length ? (
        <EmptyState title="No pending approvals" subtitle="All caught up." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={pending}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{`${item.requesterId} • ${formatDate(item.date)}`}</Text>
              <Text style={styles.amount}>{formatMoney(item.amount, item.currency)}</Text>

              <View style={styles.actionsRow}>
                <AppButton
                  label="Reject"
                  variant="danger"
                  onPress={() => void onDecision(item.id, "REJECT")}
                  disabled={decision.isPending}
                  style={styles.actionBtn}
                />
                <AppButton
                  label="Approve"
                  onPress={() => void onDecision(item.id, "APPROVE")}
                  disabled={decision.isPending}
                  style={styles.actionBtn}
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    gap: 10,
  },
  card: {
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    fontSize: 11,
    opacity: 0.7,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
});
