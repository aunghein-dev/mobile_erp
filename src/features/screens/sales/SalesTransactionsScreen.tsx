import React, { useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { DateRangePicker } from "@/shared/components/ui/DateRangePicker";
import { DrawerSheet } from "@/shared/components/ui/DrawerSheet";
import { Card } from "@/shared/components/ui/Card";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui/StateViews";
import { usePaginationSales } from "@/features/hooks/sales/useSales";
import { useCurrency } from "@/features/hooks/business/useCurrency";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { formatBatchId, formatDate } from "@/shared/lib/utils/format";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { SalesTransaction } from "@/shared/types/sales";
import { formatTime, transactionMeta } from "./salesTransactionsUtils";
import { styles } from "./salesTransactionsStyles";

const PAGE_SIZE = 20;

export default function SalesTransactionsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bizId = useBusinessStore((s) => s.bizId);
  const { selectedBase, display: displayMoney } = useCurrency();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [refundTarget, setRefundTarget] = useState<SalesTransaction | null>(null);
  const [refundQty, setRefundQty] = useState("");

  const { items, total, isLoading, error, refresh } = usePaginationSales(
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
    const batchSet = new Set<string>();

    const totals = items.reduce(
      (acc, entry) => {
        const meta = transactionMeta(entry);
        acc.sold += meta.subtotal;
        acc.original += meta.original;
        acc.margin += meta.margin;
        acc.qty += meta.qty;
        batchSet.add(meta.batchId);
        return acc;
      },
      { sold: 0, original: 0, margin: 0, qty: 0 }
    );

    return {
      ...totals,
      batches: batchSet.size,
    };
  }, [items]);

  const refreshAfterMutation = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sales(bizId) });
    await queryClient.invalidateQueries({ queryKey: ["sales"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.reports(bizId) });
    await queryClient.invalidateQueries({ queryKey: ["batch-payment"] });
    await queryClient.invalidateQueries({ queryKey: ["stocks"] });
  };

  const refundSale = useMutation({
    mutationFn: async (params: { tranId: number; newQty: number }) => {
      if (!bizId) throw new Error("No business selected");
      await api.put(routes.sales.refund(bizId, params.tranId, params.newQty), {}, { withCredentials: true });
    },
    onSuccess: async () => {
      await refreshAfterMutation();
    },
  });

  const cancelSale = useMutation({
    mutationFn: async (tranId: number) => {
      if (!bizId) throw new Error("No business selected");
      await api.delete(routes.sales.cancel(bizId, tranId), { withCredentials: true });
    },
    onSuccess: async () => {
      await refreshAfterMutation();
    },
  });

  const openRefund = (item: SalesTransaction) => {
    if (item.checkoutQty <= 1) {
      Toast.show({
        type: "error",
        text1: "Refund unavailable",
        text2: "Quantity is 1. Use cancel instead.",
      });
      return;
    }

    setRefundTarget(item);
    setRefundQty(String(Math.max(1, item.checkoutQty - 1)));
  };

  const closeRefund = () => {
    setRefundTarget(null);
    setRefundQty("");
  };

  const onConfirmRefund = async () => {
    if (!refundTarget) return;

    const nextQty = Number(refundQty || 0);
    if (!Number.isInteger(nextQty) || nextQty <= 0) {
      Toast.show({ type: "error", text1: "Invalid quantity", text2: "Enter a valid integer quantity." });
      return;
    }

    if (nextQty >= refundTarget.checkoutQty) {
      Toast.show({
        type: "error",
        text1: "Invalid quantity",
        text2: `New quantity must be between 1 and ${refundTarget.checkoutQty - 1}.`,
      });
      return;
    }

    try {
      await refundSale.mutateAsync({ tranId: refundTarget.tranId, newQty: nextQty });
      Toast.show({ type: "success", text1: "Refund processed" });
      closeRefund();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Refund failed",
        text2: getErrorMessage(err, "Unable to refund sale"),
      });
    }
  };

  const onCancelSale = (item: SalesTransaction) => {
    Alert.alert("Cancel transaction", `Cancel transaction #${item.tranId} for ${item.stkGroupName}?`, [
      { text: "Back", style: "cancel" },
      {
        text: "Cancel Checkout",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await cancelSale.mutateAsync(item.tranId);
              Toast.show({ type: "success", text1: "Transaction canceled" });
            } catch (err) {
              Toast.show({
                type: "error",
                text1: "Cancel failed",
                text2: getErrorMessage(err, "Unable to cancel sale"),
              });
            }
          })();
        },
      },
    ]);
  };

  if (isLoading && !items.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading sales transactions..." variant="cards" />
      </Screen>
    );
  }

  if (error && !items.length) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to fetch transactions"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  const mutating = refundSale.isPending || cancelSale.isPending;

  return (
    <Screen>
      <SectionTitle title="Sales Transactions" subtitle={`${total} records`} />

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
            <MaterialCommunityIcons name="clipboard-list-outline" size={13} color={theme.accent} />
            <Text style={[styles.toolbarMetaText, { color: theme.accent }]}>{recordsOnPage} in page</Text>
          </View>
        </View>

        <AppInput
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Search by batch, product, teller"
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
            <Text style={[styles.summaryCellValue, { color: theme.primary }]}>
              {displayMoney(pageSummary.sold, selectedBase)}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCell,
              {
                borderColor: pageSummary.margin >= 0 ? `${theme.success}40` : `${theme.danger}40`,
                backgroundColor: pageSummary.margin >= 0 ? `${theme.success}12` : `${theme.danger}12`,
              },
            ]}
          >
            <Text
              style={[styles.summaryCellLabel, { color: pageSummary.margin >= 0 ? theme.success : theme.danger }]}
            >
              {pageSummary.margin >= 0 ? "Margin" : "Loss"}
            </Text>
            <Text
              style={[styles.summaryCellValue, { color: pageSummary.margin >= 0 ? theme.success : theme.danger }]}
            >
              {displayMoney(Math.abs(pageSummary.margin), selectedBase)}
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
            <Text style={[styles.summaryCellLabel, { color: theme.warning }]}>Batches</Text>
            <Text style={[styles.summaryCellValue, { color: theme.warning }]}>{pageSummary.batches}</Text>
          </View>
        </View>
      </Card>

      {!items.length ? (
        <EmptyState title="No transactions" subtitle="Try changing filters." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={items}
          keyExtractor={(item, index) => `${item.batchId}-${item.tranId}-${index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => {
            const meta = transactionMeta(item);
            const marginPositive = meta.margin >= 0;

            return (
              <Card style={styles.transactionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {meta.groupName}
                    </Text>
                    <View style={styles.cardSubRow}>
                      <Text style={[styles.cardSubText, { color: theme.muted }]}>Batch {formatBatchId(meta.batchId)}</Text>
                      <Text style={[styles.cardSubDot, { color: theme.muted }]}>•</Text>
                      <Text style={[styles.cardSubText, { color: theme.muted }]}>ID #{meta.tranId}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.marginBadge,
                      {
                        borderColor: marginPositive ? `${theme.success}45` : `${theme.danger}45`,
                        backgroundColor: marginPositive ? `${theme.success}12` : `${theme.danger}12`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={marginPositive ? "trending-up" : "trending-down"}
                      size={13}
                      color={marginPositive ? theme.success : theme.danger}
                    />
                    <Text style={[styles.marginBadgeText, { color: marginPositive ? theme.success : theme.danger }]}> 
                      {marginPositive ? "Margin" : "Loss"}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountHeroWrap}>
                  <Text style={[styles.amountHeroLabel, { color: theme.muted }]}>Sub Total</Text>
                  <Text style={[styles.amountHeroValue, { color: theme.text }]}>{displayMoney(meta.subtotal, selectedBase)}</Text>
                </View>

                <View style={styles.metricRow}>
                  <View
                    style={[
                      styles.metricChip,
                      { borderColor: `${theme.accent}50`, backgroundColor: `${theme.accent}12` },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: theme.accent }]}>Qty</Text>
                    <QuantityBadge value={meta.qty} tone="accent" compact />
                  </View>

                  <View
                    style={[
                      styles.metricChip,
                      { borderColor: `${theme.primary}50`, backgroundColor: `${theme.primary}12` },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: theme.primary }]}>Unit</Text>
                    <Text style={[styles.metricValue, { color: theme.primary }]}>{displayMoney(meta.unitPrice, selectedBase)}</Text>
                  </View>

                  <View
                    style={[
                      styles.metricChip,
                      { borderColor: `${theme.warning}50`, backgroundColor: `${theme.warning}12` },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: theme.warning }]}>Original</Text>
                    <Text style={[styles.metricValue, { color: theme.warning }]}>{displayMoney(meta.original, selectedBase)}</Text>
                  </View>

                  <View
                    style={[
                      styles.metricChip,
                      {
                        borderColor: marginPositive ? `${theme.success}50` : `${theme.danger}50`,
                        backgroundColor: marginPositive ? `${theme.success}10` : `${theme.danger}10`,
                      },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: marginPositive ? theme.success : theme.danger }]}> 
                      {marginPositive ? "Margin" : "Loss"}
                    </Text>
                    <Text style={[styles.metricValue, { color: marginPositive ? theme.success : theme.danger }]}> 
                      {displayMoney(Math.abs(meta.margin), selectedBase)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.muted} />
                    <Text style={[styles.infoText, { color: theme.muted }]}> 
                      {formatDate(meta.tranDateRaw)} - {formatTime(meta.tranDateRaw)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="barcode" size={14} color={theme.muted} />
                    <Text style={[styles.infoText, { color: theme.muted }]} numberOfLines={1}> 
                      Barcode: {meta.barcode}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-outline" size={14} color={theme.muted} />
                    <Text style={[styles.infoText, { color: theme.muted }]} numberOfLines={1}> 
                      Teller: {meta.teller} • Item #{meta.itemId}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActionRow}>
                  <AppButton
                    label="Refund Qty"
                    variant="secondary"
                    onPress={() => openRefund(item)}
                    disabled={mutating || item.checkoutQty <= 1}
                    style={styles.cardActionBtn}
                  />
                  <AppButton
                    label="Cancel Checkout"
                    variant="danger"
                    onPress={() => onCancelSale(item)}
                    disabled={mutating}
                    style={styles.cardActionBtn}
                  />
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

      <DrawerSheet
        visible={Boolean(refundTarget)}
        onClose={closeRefund}
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeaderRow}>
            <View
              style={[
                styles.modalIconWrap,
                {
                  backgroundColor: `${theme.primary}14`,
                  borderColor: `${theme.primary}35`,
                },
              ]}
            >
              <MaterialCommunityIcons name="backup-restore" size={18} color={theme.primary} />
            </View>
            <View style={styles.modalTitleWrap}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Refund Quantity</Text>
              <Text style={[styles.modalSubtitle, { color: theme.muted }]} numberOfLines={1}>
                {refundTarget ? `${refundTarget.stkGroupName} • Item #${refundTarget.stkItemId}` : ""}
              </Text>
            </View>
          </View>

          {refundTarget ? (
            <Card style={styles.modalSummaryCard}>
              <View style={styles.modalSummaryRow}>
                <Text style={[styles.modalSummaryLabel, { color: theme.muted }]}>Current Qty</Text>
                <QuantityBadge value={refundTarget.checkoutQty} tone="primary" compact />
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={[styles.modalSummaryLabel, { color: theme.muted }]}>Current Amount</Text>
                <Text style={[styles.modalSummaryValue, { color: theme.text }]}> 
                  {displayMoney(refundTarget.subCheckout, selectedBase)}
                </Text>
              </View>
            </Card>
          ) : null}

          <AppInput
            label="New Quantity"
            keyboardType="number-pad"
            value={refundQty}
            onChangeText={setRefundQty}
            helperText={
              refundTarget ? `Must be between 1 and ${Math.max(1, refundTarget.checkoutQty - 1)}` : ""
            }
          />

          <View style={styles.actionsRow}>
            <AppButton label="Cancel" variant="secondary" onPress={closeRefund} style={styles.flexBtn} />
            <AppButton
              label={refundSale.isPending ? "Saving..." : "Confirm Refund"}
              onPress={onConfirmRefund}
              loading={refundSale.isPending}
              style={styles.flexBtn}
            />
          </View>
        </ScrollView>
      </DrawerSheet>
    </Screen>
  );
}
