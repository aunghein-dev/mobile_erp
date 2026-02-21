import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { DateRangePicker } from "@/shared/components/ui/DateRangePicker";
import { Card } from "@/shared/components/ui/Card";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui/StateViews";
import { usePaginationBatchPayment, type BatchPaymentRecord } from "@/features/hooks/billing/usePayment";
import { formatBatchId, formatDate, formatMoney } from "@/shared/lib/utils/format";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";

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

function normalizePaymentCode(value?: string | null) {
  const code = (value ?? "").toString().trim().toUpperCase();
  if (!code) return "-";
  return code;
}

function paymentLabel(value?: string | null) {
  const code = normalizePaymentCode(value);
  const labels: Record<string, string> = {
    CASH: "Cash",
    KPAY: "KBZ Pay",
    WAVE: "Wave",
    CARD: "Card",
    VISA: "Card",
    MPU: "Card",
    TRANSFER: "Transfer",
    BANK_TRANSFER: "Transfer",
    QR: "QR",
    WALLET: "Wallet",
  };
  return labels[code] ?? (value?.toString().trim() || "-");
}

function paymentTone(value?: string | null) {
  const code = normalizePaymentCode(value);
  const tones: Record<string, { bg: string; border: string; text: string }> = {
    CASH: { bg: "#DCFCE7", border: "#22C55E", text: "#166534" },
    KPAY: { bg: "#EFF6FF", border: "#60A5FA", text: "#1D4ED8" },
    WAVE: { bg: "#FEF9C3", border: "#FACC15", text: "#A16207" },
    CARD: { bg: "#FAE8FF", border: "#E879F9", text: "#86198F" },
    VISA: { bg: "#FAE8FF", border: "#E879F9", text: "#86198F" },
    MPU: { bg: "#FAE8FF", border: "#E879F9", text: "#86198F" },
    TRANSFER: { bg: "#ECFEFF", border: "#67E8F9", text: "#115E59" },
    BANK_TRANSFER: { bg: "#ECFEFF", border: "#67E8F9", text: "#115E59" },
    QR: { bg: "#EFF6FF", border: "#60A5FA", text: "#1D4ED8" },
    WALLET: { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155" },
  };
  return tones[code] ?? { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155" };
}

function paymentMeta(item: BatchPaymentRecord) {
  const tranDateRaw = (item.tranDate ?? item.relateDate ?? item.createdAt ?? null) as string | null;
  const teller = (item.tranUserEmail ?? item.teller ?? "-").toString().trim() || "-";
  const qty = toSafeNumber(item.soldQty);
  const subtotal = toSafeNumber(item.subSoldAmt);
  const discount = toSafeNumber(item.discount);
  const change = toSafeNumber(item.change);
  const checkout = toSafeNumber(item.checkoutAmt ?? item.relateFinalIncome);
  const payment = (item.payment ?? item.relatePaymentType ?? "-").toString();

  return {
    tranDateRaw,
    teller,
    qty,
    subtotal,
    discount,
    change,
    checkout,
    payment,
  };
}

export default function SalesBatchPaymentsScreen() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { items, total, isLoading, error, refresh } = usePaginationBatchPayment(
    page,
    PAGE_SIZE,
    search,
    startDate || undefined,
    endDate || undefined
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  if (isLoading && !items.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading batch payments..." variant="table" />
      </Screen>
    );
  }

  if (error && !items.length) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to fetch payments"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle title="Batch Payments" subtitle={`${total} records`} />

      <AppInput
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Search by batch id, teller, payment"
      />
      <DateRangePicker
        value={{ startDate, endDate }}
        onChange={({ startDate: nextStartDate, endDate: nextEndDate }) => {
          setStartDate(nextStartDate);
          setEndDate(nextEndDate);
          setPage(0);
        }}
      />

      {!items.length ? (
        <EmptyState title="No payments found" subtitle="Try changing filters." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={items}
          keyExtractor={(item, index) => `${item.batchId ?? "batch"}-${item.tranDate ?? item.relateDate ?? item.createdAt ?? index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => {
            const meta = paymentMeta(item);
            const tone = paymentTone(meta.payment);
            return (
              <Card>
                <View style={styles.reportHeader}>
                  <View style={styles.batchWrap}>
                    <Text style={[styles.batchLabel, { color: theme.muted }]}>Batch</Text>
                    <Text style={[styles.batchValue, { color: theme.primary }]}>{formatBatchId(item.batchId)}</Text>
                  </View>
                  <View style={styles.amountWrap}>
                    <Text style={[styles.amountLabel, { color: theme.muted }]}>Checkout</Text>
                    <Text style={[styles.amountValue, { color: theme.text }]}>{formatMoney(meta.checkout)}</Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View style={styles.timeDateWrap}>
                    <Text style={[styles.detailText, { color: theme.muted }]}>Time: {formatTime(meta.tranDateRaw)}</Text>
                    <Text style={[styles.detailText, { color: theme.muted }]}>Date: {formatDate(meta.tranDateRaw)}</Text>
                  </View>
                  <View style={[styles.paymentChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Text style={[styles.paymentChipText, { color: tone.text }]}>{paymentLabel(meta.payment)}</Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={[styles.metricChip, { borderColor: `${theme.success}55`, backgroundColor: `${theme.success}12` }]}>
                    <Text style={[styles.metricLabel, { color: theme.success }]}>Qty</Text>
                    <QuantityBadge value={meta.qty} tone="success" compact />
                  </View>
                  <View style={[styles.metricChip, { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}12` }]}>
                    <Text style={[styles.metricLabel, { color: theme.primary }]}>Subtotal</Text>
                    <Text style={[styles.metricValue, { color: theme.primary }]}>{formatMoney(meta.subtotal)}</Text>
                  </View>
                  <View style={[styles.metricChip, { borderColor: `${theme.warning}55`, backgroundColor: `${theme.warning}12` }]}>
                    <Text style={[styles.metricLabel, { color: theme.warning }]}>Discount</Text>
                    <Text style={[styles.metricValue, { color: theme.warning }]}>{formatMoney(meta.discount)}</Text>
                  </View>
                  <View style={[styles.metricChip, { borderColor: `${theme.accent}55`, backgroundColor: `${theme.accent}12` }]}>
                    <Text style={[styles.metricLabel, { color: theme.accent }]}>Change</Text>
                    <Text style={[styles.metricValue, { color: theme.accent }]}>{formatMoney(meta.change)}</Text>
                  </View>
                </View>

                <Text style={[styles.footerText, { color: theme.muted }]}>Teller: {meta.teller}</Text>
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
        <Text style={styles.pageText}>
          Page {page + 1} / {totalPages}
        </Text>
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
  listWrap: {
    gap: 10,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  batchWrap: {
    flex: 1,
    gap: 2,
  },
  batchLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  batchValue: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  amountWrap: {
    alignItems: "flex-end",
    gap: 2,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  amountValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  statusRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  timeDateWrap: {
    flex: 1,
    gap: 2,
  },
  detailText: {
    fontSize: 10,
    fontWeight: "600",
  },
  paymentChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paymentChipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  metricChip: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  footerText: {
    marginTop: 6,
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
  pageText: {
    minWidth: 95,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
  },
});
