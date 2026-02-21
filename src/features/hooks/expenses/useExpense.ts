import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import type { Expense, ExpenseStatus, PaymentMethod } from "@/shared/types/expense";
import { routes } from "@/shared/lib/api/routes";

type ExpenseDTO = {
  id: number | string;
  businessId: number | string;
  title: string;
  headingId: number | string;
  amount: number;
  currency: string;
  date: string;
  merchant?: string;
  description?: string;
  requesterId: number | string;
  status: ExpenseStatus;
  attachments?: { id: number | string; name: string; url?: string }[];
  approvals?: {
    managerId: number | string;
    requestedAt: string;
    decidedAt?: string;
    decision?: "APPROVE" | "REJECT";
    note?: string;
  }[];
  transaction?: {
    id: number | string;
    method: PaymentMethod;
    paidAt: string;
    reference?: string;
    amount: number;
    attachmentUrl?: string;
  } | null;
};

function mapExpense(entry: ExpenseDTO): Expense {
  return {
    id: String(entry.id),
    businessId: String(entry.businessId),
    title: entry.title,
    headingId: String(entry.headingId),
    amount: Number(entry.amount),
    currency: entry.currency,
    date: entry.date,
    merchant: entry.merchant,
    description: entry.description,
    requesterId: String(entry.requesterId),
    status: entry.status,
    attachments: (entry.attachments ?? []).map((attachment) => ({
      id: String(attachment.id),
      name: attachment.name,
      url: attachment.url,
    })),
    approvals:
      entry.approvals && entry.approvals.length
        ? entry.approvals.map((approval) => ({
            managerId: String(approval.managerId),
            requestedAt: approval.requestedAt,
            decidedAt: approval.decidedAt,
            decision: approval.decision,
            note: approval.note,
          }))
        : [{ managerId: "mgr", requestedAt: new Date().toISOString() }],
    transaction: entry.transaction
      ? {
          id: String(entry.transaction.id),
          method: entry.transaction.method,
          paidAt: entry.transaction.paidAt,
          reference: entry.transaction.reference,
          amount: Number(entry.transaction.amount),
          attachmentUrl: entry.transaction.attachmentUrl,
        }
      : undefined,
  };
}

export function useExpense(expenseId?: string) {
  const bizId = useBusinessStore((s) => s.bizId);
  const actor = useOfflineUserStore((s) => s.user?.username) ?? "system";
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.expense(bizId, expenseId),
    enabled: !!bizId && !!expenseId,
    queryFn: async () => {
      const response = await api.get<ExpenseDTO>(routes.expense.detail(bizId as number, expenseId as string), {
        withCredentials: true,
      });
      return mapExpense(response.data);
    },
  });

  const approveOrReject = useMutation({
    mutationFn: async (payload: { decision: "APPROVE" | "REJECT"; note?: string }) => {
      if (!bizId || !expenseId) return;
      const path =
        payload.decision === "APPROVE"
          ? routes.expense.approve(bizId as number, expenseId as string)
          : routes.expense.reject(bizId as number, expenseId as string);

      await api.post(
        path,
        {
          managerId: actor,
          note: payload.note ?? null,
          actorUser: actor,
        },
        {
          withCredentials: true,
          headers: { "X-Actor": actor },
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.expense(bizId, expenseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(bizId) });
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (payload: {
      method: PaymentMethod;
      paidAt: string;
      reference?: string;
      amount: number;
    }) => {
      if (!bizId || !expenseId) return;

      await api.post(
        routes.expense.transaction(bizId as number, expenseId as string),
        {
          ...payload,
          actorUser: actor,
        },
        {
          withCredentials: true,
          headers: { "X-Actor": actor },
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.expense(bizId, expenseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(bizId) });
    },
  });

  return {
    expense: detailQuery.data ?? null,
    isLoading: detailQuery.isLoading,
    isError: !!detailQuery.error,
    refresh: detailQuery.refetch,
    approveOrReject: approveOrReject.mutateAsync,
    addTransaction: addTransaction.mutateAsync,
    isMutating: approveOrReject.isPending || addTransaction.isPending,
  };
}
