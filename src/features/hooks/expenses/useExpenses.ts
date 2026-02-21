import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
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

export function useExpenses() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.expenses(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<ExpenseDTO[]>(routes.expense.list(bizId as number), {
        withCredentials: true,
      });
      return (response.data ?? []).map(mapExpense);
    },
  });

  return {
    expenses: query.data ?? [],
    isLoading: query.isLoading,
    isError: !!query.error,
    refresh: query.refetch,
  };
}
