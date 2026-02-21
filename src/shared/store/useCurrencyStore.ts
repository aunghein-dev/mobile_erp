import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";
import { api } from "@/shared/lib/api/client";
import type { CurrencyRateResponse, CurrencyState } from "@/shared/types/business";

const initialCurrency: CurrencyState = {
  defaultCurrency: "MMK",
  rates: {
    MMK: { baseInRate: 1, baseInDefault: 1 },
  },
};

function toCurrencyCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function toPositiveNumber(value: unknown, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRates(rates: CurrencyState["rates"]) {
  const nextRates: CurrencyState["rates"] = {};
  for (const [rawCode, rawRate] of Object.entries(rates ?? {})) {
    const code = toCurrencyCode(rawCode);
    if (!code) continue;
    nextRates[code] = {
      baseInRate: toPositiveNumber(rawRate?.baseInRate, 1),
      baseInDefault: toPositiveNumber(rawRate?.baseInDefault, 1),
    };
  }

  return nextRates;
}

function resolveDefaultCurrency(rates: CurrencyState["rates"], preferred?: unknown) {
  const normalizedRates = normalizeRates(rates);
  const keys = Object.keys(normalizedRates);
  if (!keys.length) return "MMK";

  const preferredCode = toCurrencyCode(preferred);
  if (preferredCode && normalizedRates[preferredCode]) {
    return preferredCode;
  }

  const derivedDefault = keys.find((key) => normalizedRates[key]?.baseInRate === 1);
  if (derivedDefault) return derivedDefault;

  return keys[0] ?? "MMK";
}

function sanitizeCurrency(nextCurrency: CurrencyState) {
  const rates = normalizeRates(nextCurrency.rates);
  if (!Object.keys(rates).length) {
    return initialCurrency;
  }
  const defaultCurrency = resolveDefaultCurrency(rates, nextCurrency.defaultCurrency);
  return {
    defaultCurrency,
    rates,
  } satisfies CurrencyState;
}

type FetchCurrencyOptions = {
  force?: boolean;
  preferDefaultBase?: boolean;
};

type CurrencyStore = {
  currency: CurrencyState;
  selectedBase: string;
  loadedBizId: number | null;
  fetchingBizId: number | null;
  lastFetchedAt: number | null;
  loading: boolean;
  isReady: boolean;
  setCurrency: (currency: CurrencyState) => void;
  setBase: (base: string) => void;
  clearCurrency: () => void;
  fetchCurrency: (bizId?: number, options?: FetchCurrencyOptions) => Promise<void>;
};

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: initialCurrency,
      selectedBase: "MMK",
      loadedBizId: null,
      fetchingBizId: null,
      lastFetchedAt: null,
      loading: false,
      isReady: false,

      setCurrency: (currency) =>
        set((state) => {
          const normalizedCurrency = sanitizeCurrency(currency);
          const selectedBase = normalizedCurrency.rates[state.selectedBase]
            ? state.selectedBase
            : normalizedCurrency.defaultCurrency;

          return {
            currency: normalizedCurrency,
            selectedBase,
            isReady: true,
          };
        }),

      setBase: (base) =>
        set((state) => {
          const code = toCurrencyCode(base);
          if (!code || code === "USD") {
            return { selectedBase: state.selectedBase };
          }
          if (state.currency.rates[code]) {
            return { selectedBase: code };
          }
          return { selectedBase: state.selectedBase };
        }),

      clearCurrency: () =>
        set({
          currency: initialCurrency,
          selectedBase: "MMK",
          loadedBizId: null,
          fetchingBizId: null,
          lastFetchedAt: null,
          loading: false,
          isReady: false,
        }),

      fetchCurrency: async (bizId, options) => {
        if (!bizId) return;

        const state = get();
        const force = options?.force ?? false;
        const preferDefaultBase = options?.preferDefaultBase ?? false;
        const fetchedWithinMs = 60 * 1000;
        const isFresh =
          state.loadedBizId === bizId &&
          state.lastFetchedAt !== null &&
          Date.now() - state.lastFetchedAt < fetchedWithinMs;

        if (!force && (state.fetchingBizId === bizId || isFresh)) return;

        set({ loading: true, fetchingBizId: bizId });

        try {
          const response = await api.get<CurrencyRateResponse[]>(`/currency-rate/${bizId}`, {
            withCredentials: true,
          });

          const payload = response.data;
          if (payload?.length) {
            const rates: CurrencyState["rates"] = {};
            payload.forEach((entry) => {
              const code = toCurrencyCode(entry.baseCurrency);
              if (!code || code === "USD") return;
              rates[code] = {
                baseInRate: toPositiveNumber(entry.baseInRate, 1),
                baseInDefault: toPositiveNumber(entry.baseInDefault, 1),
              };
            });

            const defaultCurrency = resolveDefaultCurrency(
              rates,
              payload[0]?.defaultCurrency
            );
            const normalizedCurrency = sanitizeCurrency({
              defaultCurrency,
              rates,
            });
            set((prev) => ({
              currency: normalizedCurrency,
              selectedBase: preferDefaultBase
                ? normalizedCurrency.defaultCurrency
                : normalizedCurrency.rates[prev.selectedBase]
                  ? prev.selectedBase
                  : normalizedCurrency.defaultCurrency,
              loadedBizId: bizId,
              fetchingBizId: null,
              lastFetchedAt: Date.now(),
              loading: false,
              isReady: true,
            }));
            return;
          }
        } catch (error) {
          console.error("Currency fetch error:", error);
        } finally {
          set((prev) =>
            prev.fetchingBizId === bizId
              ? { loading: false, fetchingBizId: null }
              : prev
          );
        }
      },
    }),
    {
      name: "erp.currency",
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
      partialize: (state) => ({
        currency: state.currency,
        selectedBase: state.selectedBase,
        loadedBizId: state.loadedBizId,
        lastFetchedAt: state.lastFetchedAt,
        isReady: state.isReady,
      }),
    }
  )
);
