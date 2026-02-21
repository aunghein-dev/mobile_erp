import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/shared/components/layout/Screen";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { Card } from "@/shared/components/ui/Card";
import { LoadingState, ErrorState } from "@/shared/components/ui/StateViews";
import { SparkBars } from "@/shared/components/charts/SparkBars";
import { useDashboard } from "@/features/hooks/dashboard/useDashboard";
import { useInfo } from "@/features/hooks/business/useInfo";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatMoney } from "@/shared/lib/utils/format";
import { useStorageStore } from "@/shared/store/useStorageStore";

const MAX_RADAR_ITEMS = 6;

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestamp(value?: Date | null) {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refresh } = useDashboard();
  const { business } = useInfo();
  const storageInfo = useStorageStore((s) => s.storage);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data) {
      setLastSyncedAt(new Date());
    }
  }, [data]);

  const onRefreshDashboard = async () => {
    setRefreshing(true);
    try {
      await refresh();
      setLastSyncedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const topStats = useMemo(() => {
    return [
      {
        key: "revenue",
        label: "Revenue",
        value: formatMoney(toSafeNumber(data?.minicard?.revenue)),
        tone: "green" as const,
        icon: <MaterialCommunityIcons name="cash-multiple" size={16} color="#0E8A43" />,
      },
      {
        key: "profit",
        label: "Profit",
        value: formatMoney(toSafeNumber(data?.minicard?.profit)),
        tone: "teal" as const,
        icon: <MaterialCommunityIcons name="finance" size={16} color="#0FA3B1" />,
      },
      {
        key: "growth",
        label: "Growth",
        value: `${toSafeNumber(data?.minicard?.growth)}%`,
        tone: "rose" as const,
        icon: <MaterialCommunityIcons name="trending-up" size={16} color="#C9363E" />,
      },
      {
        key: "orders",
        label: "Orders",
        value: String(toSafeNumber(data?.minicard?.orders)),
        tone: "blue" as const,
        icon: <MaterialCommunityIcons name="receipt-text-outline" size={16} color="#0B6CD8" />,
      },
      {
        key: "products",
        label: "Products",
        value: String(toSafeNumber(data?.minicard?.products)),
        tone: "orange" as const,
        icon: <MaterialCommunityIcons name="cube-outline" size={16} color="#B67215" />,
      },
    ];
  }, [data]);

  const monthlySales = useMemo(() => {
    const source = data?.barset;
    if (!source) return [];

    return source.data.map((row, monthIndex) => {
      const total = source.series.reduce((sum, series) => sum + toSafeNumber(row[series.dataKey]), 0);
      return {
        month: String(row.month ?? "-"),
        total,
        monthIndex,
      };
    });
  }, [data?.barset]);

  const visibleMonthlySales = useMemo(() => {
    if (!monthlySales.length) return [];
    if (monthlySales.length !== 12) return monthlySales.slice(-6);

    const currentMonthIndex = new Date().getMonth();
    const result: Array<(typeof monthlySales)[number]> = [];
    const windowSize = 6;

    for (let offset = windowSize - 1; offset >= 0; offset -= 1) {
      const index = (currentMonthIndex - offset + 12) % 12;
      result.push(monthlySales[index]);
    }

    return result;
  }, [monthlySales]);

  const maxMonthlySales = useMemo(() => {
    if (!visibleMonthlySales.length) return 1;
    return Math.max(...visibleMonthlySales.map((entry) => entry.total), 1);
  }, [visibleMonthlySales]);

  const latestBarsetShare = useMemo(() => {
    const source = data?.barset;
    if (!source || !source.data.length) return [];
    const currentMonthIndex = Math.min(new Date().getMonth(), source.data.length - 1);
    let lastActiveMonthIndex = -1;
    for (let idx = source.data.length - 1; idx >= 0; idx -= 1) {
      const hasValue = source.series.some((series) => toSafeNumber(source.data[idx]?.[series.dataKey]) > 0);
      if (hasValue) {
        lastActiveMonthIndex = idx;
        break;
      }
    }
    const selectedMonthIndex =
      source.series.some((series) => toSafeNumber(source.data[currentMonthIndex]?.[series.dataKey]) > 0)
        ? currentMonthIndex
        : lastActiveMonthIndex >= 0
          ? lastActiveMonthIndex
          : currentMonthIndex;
    const latestMonth = source.data[selectedMonthIndex];

    return source.series
      .map((series) => ({
        label: series.label,
        value: toSafeNumber(latestMonth[series.dataKey]),
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [data?.barset]);

  const radarRows = useMemo(() => {
    const incoming = [...(data?.radar ?? [])].slice(0, MAX_RADAR_ITEMS);
    while (incoming.length < MAX_RADAR_ITEMS) {
      incoming.push({
        metrics: `NO ITEM ${incoming.length + 1}`,
        summerPoints: 0,
        rainyPoints: 0,
        winterPoints: 0,
      });
    }
    return incoming;
  }, [data?.radar]);

  const maxRadarPoint = useMemo(() => {
    const allPoints = radarRows.flatMap((entry) => [
      toSafeNumber(entry.summerPoints),
      toSafeNumber(entry.rainyPoints),
      toSafeNumber(entry.winterPoints),
    ]);
    return Math.max(...allPoints, 1);
  }, [radarRows]);

  const pieRows = useMemo(() => {
    return [...(data?.pie ?? [])]
      .sort((a, b) => toSafeNumber(b.value) - toSafeNumber(a.value))
      .slice(0, 8);
  }, [data?.pie]);

  const maxPieValue = useMemo(() => {
    if (!pieRows.length) return 1;
    return Math.max(...pieRows.map((entry) => toSafeNumber(entry.value)), 1);
  }, [pieRows]);

  const usage = Math.max(0, Math.min(100, toSafeNumber(data?.storage?.usagePercentage)));
  const usageStatusColor = usage > 90 ? theme.danger : usage > 70 ? theme.warning : theme.success;
  const usedStorageMb = Math.ceil((toSafeNumber(storageInfo.limitStorageKb) / 1024) * usage / 100);
  const totalStorageMb = Math.ceil(toSafeNumber(storageInfo.limitStorageKb) / 1024);
  const lineValues = data?.line ?? [];
  const lineTotal = useMemo(() => lineValues.reduce((sum, value) => sum + toSafeNumber(value), 0), [lineValues]);

  if (isLoading && !data) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading dashboard..." variant="dashboard" />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to load dashboard"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void onRefreshDashboard()}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen scroll={false}>
        <ErrorState title="No dashboard data" subtitle="Please verify business setup." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefreshDashboard()}>
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={theme.primary} />
            <Text style={[styles.heroBadgeText, { color: theme.muted }]}>Production Dashboard</Text>
          </View>
          <AppPressable
            style={({ pressed }) => [
              styles.refreshBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.cardSoft,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => void onRefreshDashboard()}
            disabled={refreshing}
          >
            <MaterialCommunityIcons name={refreshing ? "loading" : "refresh"} size={15} color={theme.primary} />
            <Text style={[styles.refreshText, { color: theme.primary }]}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
          </AppPressable>
        </View>

        <Text style={[styles.heroTitle, { color: theme.text }]}>
          {business?.businessName || "Business Overview"}
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Live POS insights for sales performance, product movement, and storage health.
        </Text>

        <View style={[styles.syncTag, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
          <MaterialCommunityIcons name="pulse" size={14} color={theme.success} />
          <Text style={[styles.syncText, { color: theme.muted }]}>
            Last sync: <Text style={[styles.syncStrong, { color: theme.text }]}>{formatTimestamp(lastSyncedAt)}</Text>
          </Text>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.metricsRow}>
          {topStats.map((entry) => (
            <MetricCard
              key={entry.key}
              label={entry.label}
              value={entry.value}
              tone={entry.tone}
              icon={entry.icon}
            />
          ))}
        </View>
      </ScrollView>

      <Card>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <MaterialCommunityIcons name="chart-bar" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Sales Distribution</Text>
          </View>
          <Text style={[styles.sectionCaption, { color: theme.muted }]}>From barset</Text>
        </View>

        {!visibleMonthlySales.length ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No bar chart data available.</Text>
        ) : (
          <View style={styles.monthlyWrap}>
            {visibleMonthlySales.map((entry) => {
              const ratio = Math.max(0.05, entry.total / maxMonthlySales);
              return (
                <View key={`${entry.month}-${entry.monthIndex}`} style={styles.monthlyRow}>
                  <Text style={[styles.monthlyMonth, { color: theme.muted }]}>{entry.month}</Text>
                  <View style={[styles.monthlyTrack, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                    <View style={[styles.monthlyFill, { width: `${ratio * 100}%`, backgroundColor: theme.primary }]} />
                  </View>
                  <Text style={[styles.monthlyValue, { color: theme.text }]}>{formatMoney(entry.total)}</Text>
                </View>
              );
            })}
            {latestBarsetShare.length ? (
              <View style={styles.groupShareWrap}>
                {latestBarsetShare.map((entry) => (
                  <View key={entry.label} style={[styles.groupShareChip, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    <Text style={[styles.groupShareLabel, { color: theme.muted }]} numberOfLines={1}>
                      {entry.label}
                    </Text>
                    <Text style={[styles.groupShareValue, { color: theme.text }]}>{formatMoney(entry.value)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <MaterialCommunityIcons name="radar" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Seasonal Product Radar</Text>
          </View>
          <Text style={[styles.sectionCaption, { color: theme.muted }]}>Summer / Rainy / Winter</Text>
        </View>

        <View style={styles.radarLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#F97316" }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Summer</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#0EA5E9" }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Rainy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={[styles.legendText, { color: theme.muted }]}>Winter</Text>
          </View>
        </View>

        <View style={styles.radarRows}>
          {radarRows.map((entry) => {
            const summer = toSafeNumber(entry.summerPoints);
            const rainy = toSafeNumber(entry.rainyPoints);
            const winter = toSafeNumber(entry.winterPoints);
            return (
              <View key={entry.metrics} style={[styles.radarRow, { borderColor: theme.border }]}>
                <Text style={[styles.radarMetric, { color: theme.text }]} numberOfLines={1}>
                  {entry.metrics}
                </Text>
                <View style={styles.radarBars}>
                  <View style={[styles.radarTrack, { backgroundColor: theme.cardSoft }]}>
                    <View style={[styles.radarFill, { width: `${(summer / maxRadarPoint) * 100}%`, backgroundColor: "#F97316" }]} />
                  </View>
                  <View style={[styles.radarTrack, { backgroundColor: theme.cardSoft }]}>
                    <View style={[styles.radarFill, { width: `${(rainy / maxRadarPoint) * 100}%`, backgroundColor: "#0EA5E9" }]} />
                  </View>
                  <View style={[styles.radarTrack, { backgroundColor: theme.cardSoft }]}>
                    <View style={[styles.radarFill, { width: `${(winter / maxRadarPoint) * 100}%`, backgroundColor: "#3B82F6" }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <MaterialCommunityIcons name="harddisk" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Storage Health</Text>
          </View>
          <Text style={[styles.sectionCaption, { color: theme.muted }]}>{storageInfo.longName}</Text>
        </View>

        <View style={styles.storageHeader}>
          <Text style={[styles.storagePercent, { color: usageStatusColor }]}>{usage.toFixed(1)}%</Text>
          <Text style={[styles.storageMeta, { color: theme.muted }]}>
            {usedStorageMb} MB of {totalStorageMb} MB
          </Text>
        </View>
        <View style={[styles.storageTrack, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
          <View style={[styles.storageFill, { width: `${usage}%`, backgroundColor: usageStatusColor }]} />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <MaterialCommunityIcons name="chart-donut" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Product Mix</Text>
          </View>
          <Text style={[styles.sectionCaption, { color: theme.muted }]}>Top products</Text>
        </View>

        {!pieRows.length ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No pie chart data available.</Text>
        ) : (
          <View style={styles.pieRows}>
            {pieRows.map((entry) => {
              const value = toSafeNumber(entry.value);
              const width = Math.max(4, Math.round((value / maxPieValue) * 100));
              return (
                <View key={entry.label} style={styles.pieRow}>
                  <View style={styles.pieTop}>
                    <Text style={[styles.pieLabel, { color: theme.text }]} numberOfLines={1}>
                      {entry.label}
                    </Text>
                    <Text style={[styles.pieValue, { color: theme.primary }]}>{value.toFixed(1)}%</Text>
                  </View>
                  <View style={[styles.pieTrack, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    <View style={[styles.pieFill, { width: `${width}%`, backgroundColor: theme.primary }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <MaterialCommunityIcons name="chart-line" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Sales Trend</Text>
          </View>
          <Text style={[styles.sectionCaption, { color: theme.muted }]}>
            Last {Math.max(lineValues.length, 1)} points
          </Text>
        </View>
        <Text style={[styles.trendTotal, { color: theme.text }]}>
          Total: {formatMoney(lineTotal)}
        </Text>
        <SparkBars values={lineValues.length ? lineValues : [0]} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 10,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#F7FBFF",
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  refreshBtn: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  refreshText: {
    fontSize: 10,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 18,
  },
  syncTag: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  syncText: {
    fontSize: 10,
    fontWeight: "600",
  },
  syncStrong: {
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 8,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sectionHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionCaption: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 11,
    fontWeight: "500",
    paddingVertical: 8,
  },
  monthlyWrap: {
    gap: 8,
  },
  monthlyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthlyMonth: {
    width: 34,
    fontSize: 10,
    fontWeight: "700",
  },
  monthlyTrack: {
    flex: 1,
    height: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    overflow: "hidden",
  },
  monthlyFill: {
    height: "100%",
    borderRadius: 10,
  },
  monthlyValue: {
    minWidth: 70,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "700",
  },
  groupShareWrap: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groupShareChip: {
    minWidth: "48%",
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 2,
  },
  groupShareLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  groupShareValue: {
    fontSize: 10,
    fontWeight: "800",
  },
  radarLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 10,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
  },
  radarRows: {
    gap: 8,
  },
  radarRow: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 8,
  },
  radarMetric: {
    fontSize: 11,
    fontWeight: "700",
  },
  radarBars: {
    gap: 5,
  },
  radarTrack: {
    height: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  radarFill: {
    height: "100%",
    borderRadius: 10,
  },
  storageHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  storagePercent: {
    fontSize: 22,
    fontWeight: "900",
  },
  storageMeta: {
    fontSize: 11,
    fontWeight: "600",
  },
  storageTrack: {
    height: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    overflow: "hidden",
  },
  storageFill: {
    height: "100%",
    borderRadius: 10,
  },
  pieRows: {
    gap: 8,
  },
  pieRow: {
    gap: 5,
  },
  pieTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pieLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  pieValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  pieTrack: {
    height: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    overflow: "hidden",
  },
  pieFill: {
    height: "100%",
    borderRadius: 10,
  },
  trendTotal: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
});
