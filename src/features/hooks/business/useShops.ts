import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useInfo } from "./useInfo";
import type { Shop } from "@/shared/types/business";
import { routes } from "@/shared/lib/api/routes";

export function useShops() {
  const { business } = useInfo();
  const bizId = business?.businessId;

  const query = useQuery({
    queryKey: queryKeys.shops(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<Shop[]>(routes.business.shopsAll(bizId as number), {
        withCredentials: true,
      });
      return response.data ?? [];
    },
  });

  return {
    shops: query.data ?? [],
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
