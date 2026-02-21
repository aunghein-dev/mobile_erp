import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { getWithFallback } from "@/shared/lib/api/fallback";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import type { PaginatedResponse } from "@/shared/types/common";
import { routes } from "@/shared/lib/api/routes";

export type BatchPaymentRecord = {
  batchId?: string;
  tranUserEmail?: string;
  tranDate?: string;
  subSoldAmt?: number;
  soldQty?: number;
  change?: number;
  discount?: number;
  checkoutAmt?: number;
  payment?: string;

  // Legacy fields kept for backward compatibility with older API responses.
  relatePaymentType?: string;
  relateFinalIncome?: number;
  relateDate?: string;
  createdAt?: string;
  teller?: string;
  [key: string]: unknown;
};

export function useBatchPayment() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: ["batch-payment", bizId ?? 0, "all"],
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<BatchPaymentRecord[]>(routes.sales.batchPayment(bizId as number), {
        withCredentials: true,
      });
      return response.data ?? [];
    },
  });

  return {
    items: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function usePaginationBatchPayment(
  page: number,
  pageSize: number,
  search: string,
  startDate?: string | null,
  endDate?: string | null
) {
  const bizId = useBusinessStore((s) => s.bizId);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(pageSize));
  if (search) params.set("search", search);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const query = useQuery({
    queryKey: queryKeys.batchPayment(bizId, page, pageSize, search, startDate, endDate),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await getWithFallback<PaginatedResponse<BatchPaymentRecord>>(
        [
          routes.sales.batchPaymentPaginated(bizId as number, params.toString()),
          routes.sales.batchPaymentPaginatedAll(bizId as number, params.toString()),
        ],
        { withCredentials: true }
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  return {
    items: query.data?.content ?? [],
    total: query.data?.totalElements ?? 0,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
