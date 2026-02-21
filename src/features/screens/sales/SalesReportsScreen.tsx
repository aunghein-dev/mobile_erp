import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { DateRangePicker } from "@/shared/components/ui/DateRangePicker";
import { Card } from "@/shared/components/ui/Card";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui/StateViews";
import { usePaginationReports } from "@/features/hooks/sales/useReports";
import { formatBatchId, formatDate, formatMoney } from "@/shared/lib/utils/format";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { BatchReport } from "@/shared/types/sales";

const PAGE_SIZE = 20;

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTime(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function reportMeta(item: BatchReport) {
  const soldQty = toSafeNumber(item.totalQty ?? item.soldQty);
  const itemCount = toSafeNumber(item.stkItemCnt);
  const soldAmount = toSafeNumber(item.checkoutTotal ?? item.totalAmount);
  const profit = toSafeNumber(item.profit);
  const tranDateRaw = item.tranDate ?? item.batchDate ?? null;
  const teller = (item.tranUserEmail ?? item.teller ?? "-").toString().trim() || "-";

  return {
    soldQty,
    itemCount,
    soldAmount,
    profit,
    tranDateRaw,
    teller,
  };
}

export default function SalesReportsScreen() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { items, total, isLoading, error, refresh } = usePaginationReports(
    page,
    PAGE_SIZE,
    search,
    startDate || undefined,
    endDate || undefined
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const hasDateFilter = Boolean(startDate || endDate);
  const recordsOnPage = items.length;
  const dateSummary = useMemo(() => {
    if (!hasDateFilter) return "All dates";
    const start = startDate.trim() || "Start";
    const end = endDate.trim() || "Now";
    return `${start} -> ${end}`;
  }, [endDate, hasDateFilter, startDate]);

  const pageSummary = useMemo(() => {
    return items.reduce(
      (acc, entry) => {
        const meta = reportMeta(entry);
        acc.sold += meta.soldAmount;
        acc.profit += meta.profit;
        acc.qty += meta.soldQty;
        acc.itemCount += meta.itemCount;
        return acc;
      },
      { sold: 0, profit: 0, qty: 0, itemCount: 0 }
    );
  }, [items]);

  if (isLoading && !items.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading sales reports..." variant="cards" />
      </Screen>
    );
  }

  if (error && !items.length) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to fetch reports"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle title="Sales Reports" subtitle={`${total} records`} />

      <Card style={styles.toolbarCard}>
        <View style={styles.toolbarMetaRow}>
          <View
            style={[
              styles.toolbarMetaChip,
              {
                borderColor: `${theme.primary}3A`,
                backgroundColor: `${theme.primary}12`,
              },
            ]}
          >
            <MaterialCommunityIcons name="calendar-range-outline" size={13} color={theme.primary} />
            <Text style={[styles.toolbarMetaText, { color: theme.primary }]} numberOfLines={1}>
              {dateSummary}
            </Text>
          </View>

          <View
            style={[
              styles.toolbarMetaChip,
              {
                borderColor: `${theme.accent}4A`,
                backgroundColor: `${theme.accent}14`,
              },
            ]}
          >
            <MaterialCommunityIcons name="file-chart-outline" size={13} color={theme.accent} />
            <Text style={[styles.toolbarMetaText, { color: theme.accent }]}>{recordsOnPage} in page</Text>
          </View>
        </View>

        <AppInput
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Search by batch id or teller"
        />

        <DateRangePicker
          value={{ startDate, endDate }}
          onChange={({ startDate: nextStartDate, endDate: nextEndDate }) => {
            setStartDate(nextStartDate);
            setEndDate(nextEndDate);
            setPage(0);
          }}
        />

        <View style={styles.filterActionRow}>
          <AppButton
            label="Refresh"
            variant="secondary"
            onPress={() => void refresh()}
            leftIcon={<MaterialCommunityIcons name="refresh" size={15} color={theme.text} />}
            style={styles.refreshBtn}
          />
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Current Page Snapshot</Text>
          <Text style={[styles.summaryCaption, { color: theme.muted }]}>Page {page + 1} / {totalPages}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCell,
              { borderColor: `${theme.primary}40`, backgroundColor: `${theme.primary}12` },
            ]}
          >
            <Text style={[styles.summaryCellLabel, { color: theme.primary }]}>Sold</Text>
            <Text style={[styles.summaryCellValue, { color: theme.primary }]}>{formatMoney(pageSummary.sold)}</Text>
          </View>

          <View
            style={[
              styles.summaryCell,
              {
                borderColor: pageSummary.profit >= 0 ? `${theme.success}40` : `${theme.danger}40`,
                backgroundColor: pageSummary.profit >= 0 ? `${theme.success}12` : `${theme.danger}12`,
              },
            ]}
          >
            <Text style={[styles.summaryCellLabel, { color: pageSummary.profit >= 0 ? theme.success : theme.danger }]}>
              {pageSummary.profit >= 0 ? "Profit" : "Loss"}
            </Text>
            <Text style={[styles.summaryCellValue, { color: pageSummary.profit >= 0 ? theme.success : theme.danger }]}>
              {formatMoney(Math.abs(pageSummary.profit))}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCell,
              { borderColor: `${theme.accent}40`, backgroundColor: `${theme.accent}12` },
            ]}
          >
            <Text style={[styles.summaryCellLabel, { color: theme.accent }]}>Qty</Text>
            <QuantityBadge value={pageSummary.qty} tone="accent" />
          </View>

          <View
            style={[
              styles.summaryCell,
              { borderColor: `${theme.warning}40`, backgroundColor: `${theme.warning}12` },
            ]}
          >
            <Text style={[styles.summaryCellLabel, { color: theme.warning }]}>Items</Text>
            <Text style={[styles.summaryCellValue, { color: theme.warning }]}>{pageSummary.itemCount.toLocaleString()}</Text>
          </View>
        </View>
      </Card>

      {!items.length ? (
        <EmptyState title="No reports found" subtitle="Try changing filters." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={items}
          keyExtractor={(item, index) => `${item.batchId}-${item.tranDate ?? item.batchDate ?? index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => {
            const meta = reportMeta(item);
            const positive = meta.profit >= 0;
            return (
              <Card style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.batchWrap}>
                    <View style={[styles.batchTitleRow, { backgroundColor: `${theme.primary}12` }]}>
                      <MaterialCommunityIcons name="layers-triple-outline" size={14} color={theme.primary} />
                      <Text style={[styles.batchLabel, { color: theme.primary }]}>Batch</Text>
                    </View>
                    <Text style={[styles.batchValue, { color: theme.text }]}>{formatBatchId(item.batchId)}</Text>
                  </View>

                  <View
                    style={[
                      styles.profitBadge,
                      {
                        borderColor: positive ? `${theme.success}45` : `${theme.danger}45`,
                        backgroundColor: positive ? `${theme.success}12` : `${theme.danger}12`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={positive ? "trending-up" : "trending-down"}
                      size={13}
                      color={positive ? theme.success : theme.danger}
                    />
                    <Text style={[styles.profitBadgeText, { color: positive ? theme.success : theme.danger }]}>
                      {positive ? "Profit" : "Loss"}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountHeroWrap}>
                  <Text style={[styles.amountLabel, { color: theme.muted }]}>Sold Amount</Text>
                  <Text style={[styles.amountValue, { color: theme.text }]}>{formatMoney(meta.soldAmount)}</Text>
                </View>

                <View style={styles.metricRow}>
                  <View
                    style={[
                      styles.metricChip,
                      { borderColor: `${theme.success}50`, backgroundColor: `${theme.success}12` },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: theme.success }]}>Qty</Text>
                    <QuantityBadge value={meta.soldQty} tone="success" compact />
                  </View>

                  <View
                    style={[
                      styles.metricChip,
                      { borderColor: `${theme.accent}50`, backgroundColor: `${theme.accent}12` },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: theme.accent }]}>Items</Text>
                    <QuantityBadge value={meta.itemCount} tone="accent" compact />
                  </View>

                  <View
                    style={[
                      styles.metricChip,
                      {
                        borderColor: positive ? `${theme.success}50` : `${theme.danger}50`,
                        backgroundColor: positive ? `${theme.success}10` : `${theme.danger}10`,
                      },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: positive ? theme.success : theme.danger }]}>
                      {positive ? "Profit" : "Loss"}
                    </Text>
                    <Text style={[styles.metricValue, { color: positive ? theme.success : theme.danger }]}>
                      {formatMoney(Math.abs(meta.profit))}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.muted} />
                    <Text style={[styles.detailText, { color: theme.muted }]}>
                      {formatDate(meta.tranDateRaw)} - {formatTime(meta.tranDateRaw)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-outline" size={14} color={theme.muted} />
                    <Text style={[styles.detailText, { color: theme.muted }]} numberOfLines={1}>
                      Teller: {meta.teller}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      <View style={styles.paginationWrap}>
        <AppButton
          label="Prev"
          variant="secondary"
          disabled={page <= 0}
          onPress={() => setPage((current) => Math.max(0, current - 1))}
          style={styles.pageButton}
        />

        <View style={[styles.pageBadgeWrap, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          <Text style={[styles.pageText, { color: theme.text }]}>{page + 1} / {totalPages}</Text>
        </View>

        <AppButton
          label="Next"
          variant="secondary"
          disabled={page + 1 >= totalPages}
          onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          style={styles.pageButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbarCard: {
    gap: 10,
    borderRadius: 10,
  },
  toolbarMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  toolbarMetaChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  toolbarMetaText: {
    fontSize: 10,
    fontWeight: "700",
  },
  filterActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  refreshBtn: {
    minWidth: 104,
  },
  summaryCard: {
    gap: 10,
    borderRadius: 10,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  summaryCaption: {
    fontSize: 10,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryCell: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    minWidth: 132,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  summaryCellLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  summaryCellValue: {
    fontSize: 12,
    fontWeight: "900",
  },
  listWrap: {
    gap: 10,
  },
  reportCard: {
    gap: 10,
    borderRadius: 10,
    padding: 12,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  batchWrap: {
    flex: 1,
    gap: 5,
  },
  batchTitleRow: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  batchLabel: {
    fontSize: 10,
    fontWeight: "800",
  },
  batchValue: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  profitBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  profitBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  amountHeroWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE8F2",
    backgroundColor: "#F8FCFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  metricChip: {
    minWidth: 98,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 1,
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "900",
  },
  detailCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DFE8F1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  detailText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  paginationWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  pageButton: {
    flex: 1,
  },
  pageBadgeWrap: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pageText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
