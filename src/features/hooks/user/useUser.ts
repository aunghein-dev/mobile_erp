import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import type { OfflineUser } from "@/shared/types/user";
import { routes } from "@/shared/lib/api/routes";

export function useUser() {
  const setUser = useOfflineUserStore((s) => s.setUser);

  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const response = await api.get<OfflineUser>(routes.business.infoMeAccount, {
        withCredentials: true,
      });
      return response.data;
    },
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
