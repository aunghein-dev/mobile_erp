import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { routes } from "@/shared/lib/api/routes";

export function useInvoice() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.invoices(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get(routes.billing.invoices(bizId as number), { withCredentials: true });
      return response.data;
    },
  });

  return {
    invoices: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
