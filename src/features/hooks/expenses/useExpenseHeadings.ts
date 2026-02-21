import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import type { ExpenseHeading, ExpenseHeadingResponse } from "@/shared/types/expense";
import { routes } from "@/shared/lib/api/routes";

function mapResponse(data: ExpenseHeadingResponse[]): ExpenseHeading[] {
  return data.map((item) => ({
    id: String(item.rowId),
    name: item.expenseName,
    code: item.expenseCode,
    glAccount: item.glAccount ?? undefined,
    taxTreatment: item.taxTreatment,
    perTxnLimit: item.perTxnLimit ?? null,
    dailyLimit: item.dailyLimit ?? null,
    isActive: item.isActive,
    notes: item.note ?? undefined,
  }));
}

export function useExpenseHeadings() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.expenseHeadings(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<ExpenseHeadingResponse[]>(routes.expense.headings(bizId as number), {
        withCredentials: true,
      });
      return mapResponse(response.data ?? []);
    },
  });

  return {
    headings: query.data ?? [],
    isLoading: query.isLoading,
    isError: !!query.error,
    refresh: query.refetch,
  };
}
