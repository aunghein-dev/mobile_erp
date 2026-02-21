import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/shared/lib/api/client";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { routes } from "@/shared/lib/api/routes";

export function useSupplier() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: ["suppliers", bizId ?? 0],
    enabled: !!bizId,
    queryFn: async () => {
      try {
        const response = await api.get(routes.inventory.suppliers(bizId as number), {
          withCredentials: true,
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
  });

  return {
    suppliers: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
