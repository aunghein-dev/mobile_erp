import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import type { Customer, CustomerDashboard } from "@/shared/types/customer";
import { routes } from "@/shared/lib/api/routes";

export function useCustomer() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.customers(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<Customer[]>(routes.inventory.customers(bizId as number), {
        withCredentials: true,
      });
      return response.data ?? [];
    },
  });

  return {
    customers: query.data ?? [],
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function useCustomerDashboard() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.customerDashboard(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<CustomerDashboard>(
        routes.inventory.customersDashboard(bizId as number),
        {
        withCredentials: true,
        }
      );
      return response.data;
    },
  });

  return {
    dashboard: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function useRevalidateCustomerCaches() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
  };
}
