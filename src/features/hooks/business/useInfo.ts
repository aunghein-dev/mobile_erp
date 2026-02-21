import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import type { BusinessInfo } from "@/shared/types/business";
import { routes } from "@/shared/lib/api/routes";

export function useInfo() {
  const query = useQuery({
    queryKey: queryKeys.info,
    queryFn: async () => {
      const response = await api.get<BusinessInfo>(routes.business.infoMe, { withCredentials: true });
      return response.data;
    },
  });

  return {
    business: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
