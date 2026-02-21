import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { DateRangePicker } from "@/shared/components/ui/DateRangePicker";
import { ListRow } from "@/shared/components/ui/ListRow";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { LoadingState, EmptyState, ErrorState } from "@/shared/components/ui/StateViews";
import { usePaginationCurrencySales } from "@/features/hooks/sales/useCurrencySales";
import { formatBatchId, formatDate, formatMoney } from "@/shared/lib/utils/format";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";

const PAGE_SIZE = 20;

export default function CurrencyReportScreen() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { items, total, isLoading, error, refresh } = usePaginationCurrencySales(
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
        <LoadingState label="Loading currency report..." variant="table" />
      </Screen>
    );
  }

  if (error && !items.length) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to fetch currency report"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle title="Currency Sales Report" subtitle={`${total} records`} />

      <AppInput
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Search by batch, currency, teller"
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
        <EmptyState title="No currency report rows" subtitle="Try another filter." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={items}
          keyExtractor={(item, index) => `${item.batchId}-${index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <ListRow
              title={`Batch ${formatBatchId(item.batchId)}`}
              subtitle={`${item.soldCurrency} • ${item.teller || "-"}`}
              right={
                <View style={styles.rightWrap}>
                  <Text style={[styles.rightAmount, { color: theme.primary }]}>
                    {formatMoney(item.incomeInSoldCurrency, item.soldCurrency)}
                  </Text>
                  <QuantityBadge value={item.soldQty} prefix="Qty" tone="accent" compact />
                </View>
              }
              footer={formatDate(item.tranDate)}
            />
          )}
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
  rightWrap: {
    alignItems: "flex-end",
    gap: 4,
  },
  rightAmount: {
    fontSize: 11,
    fontWeight: "800",
  },
  listWrap: {
    gap: 10,
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
