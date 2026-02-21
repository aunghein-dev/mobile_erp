import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import type { Teller } from "@/shared/types/user";
import { routes } from "@/shared/lib/api/routes";

type RawTeller = Teller & {
  id?: number | string | null;
  userId?: number | string | null;
  accountId?: number | string | null;
  rowId?: number | string | null;
};

function parseNumericId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeTeller(raw: RawTeller): Teller {
  const normalizedId =
    parseNumericId(raw.id) ??
    parseNumericId(raw.userId) ??
    parseNumericId(raw.accountId) ??
    parseNumericId(raw.rowId);

  return {
    ...raw,
    id: normalizedId,
  };
}

export function useTeller() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.tellers(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<RawTeller[]>(routes.users.tellers(bizId as number), {
        withCredentials: true,
      });
      return (response.data ?? []).map(normalizeTeller);
    },
  });

  return {
    tellers: query.data ?? [],
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
