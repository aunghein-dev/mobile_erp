import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { routes } from "@/shared/lib/api/routes";

export type BillingInfo = {
  currExpireDate: string;
  currPlanCode: string;
  [key: string]: unknown;
};

export function useBilling() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.billing(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<BillingInfo>(routes.billing.byBiz(bizId as number), {
        withCredentials: true,
      });
      return response.data;
    },
  });

  return {
    billing: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
