import { useCallback, useEffect, useMemo } from "react";
import { useCurrencyStore } from "@/shared/store/useCurrencyStore";
import { useBusinessStore } from "@/shared/store/useBusinessStore";

const CURRENCY_SYMBOLS: Record<string, string> = {
  MMK: "Ks",
  THB: "฿",
};

export function useCurrency() {
  const {
    currency,
    selectedBase,
    setBase,
    fetchCurrency,
    loading,
    isReady,
    fetchingBizId,
  } = useCurrencyStore();
  const bizId = useBusinessStore((state) => state.bizId);

  useEffect(() => {
    if (!bizId) return;
    if (fetchingBizId === bizId) return;
    void fetchCurrency(bizId);
  }, [bizId, fetchingBizId, fetchCurrency]);

  const availableBases = useMemo(() => {
    const keys = Object.keys(currency.rates).map((key) => key.trim().toUpperCase());
    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
    const withoutUsd = uniqueKeys.filter((key) => key !== "USD");
    if (withoutUsd.length) return withoutUsd;
    if (selectedBase && selectedBase !== "USD") return [selectedBase];
    return ["MMK"];
  }, [currency.rates, selectedBase]);

  useEffect(() => {
    if (!availableBases.length) return;
    if (!availableBases.includes(selectedBase)) {
      setBase(availableBases[0]);
    }
  }, [availableBases, selectedBase, setBase]);

  const convert = useCallback(
    (amount: number, base?: string) => {
      const from = base ?? selectedBase;
      return amount * (currency.rates?.[from]?.baseInDefault ?? 1);
    },
    [currency.rates, selectedBase]
  );

  const formatMoney = useCallback(
    (amount: number, base?: string, showSymbol = true) => {
      const key = (base ?? selectedBase).trim().toUpperCase();
      const symbol = showSymbol ? CURRENCY_SYMBOLS[key] ?? "" : "";
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      const value = Math.round(safeAmount);
      const formatted = new Intl.NumberFormat("en-US").format(value);
      return symbol ? `${symbol}\u00A0${formatted}` : formatted;
    },
    [selectedBase]
  );

  const display = useCallback(
    (amount: number, base?: string) => formatMoney(convert(amount, base), base),
    [convert, formatMoney]
  );

  return {
    currency,
    selectedBase,
    availableBases,
    setBase,
    convert,
    formatMoney,
    format: formatMoney,
    display,
    loading,
    isReady,
  };
}
