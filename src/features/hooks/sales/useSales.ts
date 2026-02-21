import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { getWithFallback } from "@/shared/lib/api/fallback";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import type { SalesTransaction } from "@/shared/types/sales";
import type { PaginatedResponse } from "@/shared/types/common";
import { routes } from "@/shared/lib/api/routes";

export function useSales() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: ["sales", bizId ?? 0, "all"],
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<SalesTransaction[]>(routes.sales.checkout(bizId as number), {
        withCredentials: true,
      });
      return response.data ?? [];
    },
  });

  return {
    items: query.data ?? [],
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function usePaginationSales(
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
    queryKey: queryKeys.sales(bizId, page, pageSize, search, startDate, endDate),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await getWithFallback<PaginatedResponse<SalesTransaction>>(
        [
          routes.sales.checkoutPaginated(bizId as number, params.toString()),
          routes.sales.checkoutPaginatedAll(bizId as number, params.toString()),
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
