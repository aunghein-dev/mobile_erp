import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Toast from "react-native-toast-message";
import { Screen } from "@/shared/components/layout/Screen";
import { Card } from "@/shared/components/ui/Card";
import { AppButton } from "@/shared/components/ui/AppButton";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { useStockCheck } from "@/features/hooks/inventory/useStockCheck";
import { useFilteredStocks } from "@/features/hooks/inventory/useStocks";
import { useBarcodeSettingsStore } from "@/shared/store/useBarcodeSettingsStore";
import { useCartStore } from "@/shared/store/useCartStore";

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { items } = useFilteredStocks();
  const { checkStockByBarcode, checkingStock } = useStockCheck();
  const scannerSettings = useBarcodeSettingsStore((s) => s.settings);
  const addItemByBarcode = useCartStore((s) => s.addItemByBarcode);
  const totalQty = useCartStore((s) => s.totalQty);

  const [scanned, setScanned] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState<number | null>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  const onScan = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    const now = Date.now();
    const lastScan = lastScanRef.current;
    if (lastScan && lastScan.code === trimmed && now - lastScan.time < 1200) {
      return;
    }
    lastScanRef.current = { code: trimmed, time: now };

    setScanned(trimmed);
    const qty = await checkStockByBarcode(trimmed);
    setStockQty(qty);

    if (qty <= 0) {
      Toast.show({
        type: "error",
        text1: "Out of stock",
        text2: `${trimmed} has no available quantity.`,
      });
      return;
    }

    const added = addItemByBarcode(trimmed, items);
    if (!added) {
      Toast.show({
        type: "error",
        text1: "Cannot add to cart",
        text2: "Item is unavailable in current stock pool or already maxed in cart.",
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "Added to cart",
      text2: `${trimmed} added. Cart qty: ${useCartStore.getState().totalQty}`,
    });
  };

  if (!permission) {
    return (
      <Screen scroll={false}>
        <Text>Checking camera permission...</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen scroll={false}>
        <Card style={styles.permissionCard}>
          <SectionTitle title="Camera Access Needed" subtitle="Grant permission to scan barcode labels." />
          <AppButton label="Grant Access" onPress={() => void requestPermission()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle title="Barcode Scanner" subtitle="Scan to add to cart instantly" />
      <View style={styles.qtyRow}>
        <QuantityBadge value={totalQty} prefix="Cart Qty" tone={totalQty > 0 ? "accent" : "neutral"} />
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          autofocus={scannerSettings.scannerAutoFocus ? "on" : "off"}
          onBarcodeScanned={({ data }) => void onScan(data)}
        />
      </View>

      <Card style={styles.resultCard}>
        <Text style={styles.resultTitle}>Latest Scan</Text>
        <Text style={styles.resultValue}>{scanned || "No barcode scanned yet"}</Text>
        {scanned ? (
          checkingStock ? (
            <Text style={styles.resultStock}>Checking stock...</Text>
          ) : (
            <QuantityBadge
              value={stockQty ?? 0}
              prefix="Available Qty"
              tone={(stockQty ?? 0) > 0 ? "success" : "warning"}
            />
          )
        ) : null}
        <Text style={styles.resultHint}>Successful scan will add item directly to cart.</Text>
      </Card>

      <AppButton label="Scan Again" variant="secondary" onPress={() => setScanned(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  permissionCard: {
    gap: 14,
    marginTop: 20,
  },
  cameraWrap: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8E2ED",
    minHeight: 320,
  },
  camera: {
    width: "100%",
    height: 320,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultCard: {
    gap: 8,
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.7,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  resultStock: {
    fontSize: 13,
    fontWeight: "600",
  },
  resultHint: {
    fontSize: 11,
    opacity: 0.7,
  },
});
