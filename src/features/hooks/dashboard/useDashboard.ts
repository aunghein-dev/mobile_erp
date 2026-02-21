import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { routes } from "@/shared/lib/api/routes";

type PieApiResponse = {
  product: string;
  data: number;
};

type BarsetData = {
  groupName: string;
  value: Array<string | number>;
};

export type DashboardModel = {
  minicard: {
    revenue: number;
    growth: number;
    orders: string;
    products: string;
    profit: number;
  } | null;
  radar: Array<{
    metrics: string;
    summerPoints: number;
    rainyPoints: number;
    winterPoints: number;
  }>;
  pie: Array<{ label: string; value: number }>;
  line: number[];
  barset: {
    series: Array<{ dataKey: string; label: string }>;
    data: Array<Record<string, string | number>>;
  };
  storage: {
    usagePercentage: number | null;
  } | null;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useDashboard() {
  const bizId = useBusinessStore((s) => s.bizId);

  const query = useQuery({
    queryKey: queryKeys.dashboard(bizId),
    enabled: !!bizId,
    queryFn: async (): Promise<DashboardModel> => {
      const [radarRes, minicardRes, storageRes, pieRes, lineRes, barsetRes] = await Promise.all([
        api.get(routes.dashboard.radar(bizId as number), { withCredentials: true }),
        api.get(routes.dashboard.miniCard(bizId as number), { withCredentials: true }),
        api.get(routes.dashboard.storage(bizId as number), { withCredentials: true }),
        api.get(routes.dashboard.pie(bizId as number), { withCredentials: true }),
        api.get(routes.dashboard.line(bizId as number), { withCredentials: true }),
        api.get(routes.dashboard.barSet(bizId as number), { withCredentials: true }),
      ]);

      const barsetPayload = (barsetRes.data ?? []) as BarsetData[];
      const uniqueSeries = new Map<string, { dataKey: string; label: string }>();

      barsetPayload.forEach((entry) => {
        const key = entry.groupName.trim();
        if (!uniqueSeries.has(key)) {
          uniqueSeries.set(key, { dataKey: key, label: key });
        }
      });

      const transformed = months.map((month) => {
        const row: Record<string, string | number> = { month };
        uniqueSeries.forEach((series, key) => {
          row[key] = 0;
          row[series.dataKey] = 0;
        });
        return row;
      });

      barsetPayload.forEach((group) => {
        const key = group.groupName.trim();
        group.value.forEach((rawValue, index) => {
          const value = typeof rawValue === "string" ? parseFloat(rawValue) : rawValue;
          if (transformed[index]) {
            transformed[index][key] = Number.isFinite(value) ? Number(value) : 0;
          }
        });
      });

      return {
        minicard: minicardRes.data,
        radar: radarRes.data ?? [],
        storage: storageRes.data ?? null,
        pie: ((pieRes.data ?? []) as PieApiResponse[]).map((entry) => ({
          label: entry.product,
          value: entry.data,
        })),
        line: (lineRes.data ?? []).map((entry: { data?: number }) => Number(entry?.data ?? 0)),
        barset: {
          series: Array.from(uniqueSeries.values()),
          data: transformed,
        },
      };
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
