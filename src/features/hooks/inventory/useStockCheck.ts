import { useCallback, useRef, useState } from "react";
import { api } from "@/shared/lib/api/client";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import type { StockCheckResult } from "@/shared/types/stock";
import { routes } from "@/shared/lib/api/routes";

export function useStockCheck() {
  const bizId = useBusinessStore((s) => s.bizId);
  const [checkingStock, setCheckingStock] = useState(false);
  const stockCache = useRef<Map<string, { quantity: number; timestamp: number }>>(new Map());
  const cacheDurationMs = 30_000;

  const checkStockByBarcode = useCallback(
    async (barcode: string): Promise<number> => {
      if (!bizId) return 0;

      const cached = stockCache.current.get(barcode);
      if (cached && Date.now() - cached.timestamp < cacheDurationMs) {
        return cached.quantity;
      }

      try {
        setCheckingStock(true);
        const response = await api.get(routes.inventory.stockByBarcode(bizId, barcode), {
          withCredentials: true,
        });

        const groupData = response.data as { items?: StockCheckResult[] };
        const items = Array.isArray(groupData?.items) ? groupData.items : [];
        const scannedItem = items.find((item) => item.barcodeNo === barcode);
        const quantity = scannedItem ? scannedItem.itemQuantity : 0;

        stockCache.current.set(barcode, { quantity, timestamp: Date.now() });

        return quantity;
      } catch {
        return 0;
      } finally {
        setCheckingStock(false);
      }
    },
    [bizId]
  );

  const clearCache = useCallback(() => {
    stockCache.current.clear();
  }, []);

  return {
    checkStockByBarcode,
    checkingStock,
    clearCache,
  };
}
