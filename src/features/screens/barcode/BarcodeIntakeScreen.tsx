import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { ListRow } from "@/shared/components/ui/ListRow";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { EmptyState } from "@/shared/components/ui/StateViews";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";

type IntakeItem = {
  barcode: string;
  quantity: number;
};

export default function BarcodeIntakeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [items, setItems] = useState<IntakeItem[]>([]);

  const totalScans = useMemo(
    () => items.reduce((sum, entry) => sum + entry.quantity, 0),
    [items]
  );

  const appendBarcode = (barcode: string) => {
    if (!barcode) return;
    setItems((current) => {
      const found = current.find((entry) => entry.barcode === barcode);
      if (!found) return [...current, { barcode, quantity: 1 }];
      return current.map((entry) =>
        entry.barcode === barcode
          ? {
              ...entry,
              quantity: entry.quantity + 1,
            }
          : entry
      );
    });
  };

  return (
    <Screen>
      <SectionTitle title="Stock Intake By Barcode" subtitle="Scan and count incoming stock" />
      <View style={styles.qtyRow}>
        <QuantityBadge value={totalScans} prefix="Total Scanned" tone={totalScans > 0 ? "accent" : "neutral"} />
      </View>

      {!permission?.granted ? (
        <Card>
          <AppButton label="Enable Camera" onPress={() => void requestPermission()} />
        </Card>
      ) : (
        <Card style={styles.cameraCard}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={({ data }) => appendBarcode(data)}
          />
        </Card>
      )}

      <Card style={styles.manualCard}>
        <AppInput value={manual} onChangeText={setManual} placeholder="Manual barcode entry" />
        <AppButton
          label="Add Manually"
          onPress={() => {
            appendBarcode(manual.trim());
            setManual("");
          }}
        />
      </Card>

      {!items.length ? (
        <EmptyState title="No scanned barcodes" subtitle="Start scanning or enter manually." />
      ) : (
        <FlatList
          {...DEFAULT_LIST_PERFORMANCE_PROPS}
          data={items}
          keyExtractor={(item) => item.barcode}
          scrollEnabled={false}
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => (
            <ListRow
              title={item.barcode}
              subtitle="Intake barcode"
              right={<QuantityBadge value={item.quantity} prefix="Qty" tone="accent" compact />}
            />
          )}
        />
      )}

      <AppButton label="Clear Intake List" variant="secondary" onPress={() => setItems([])} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cameraCard: {
    padding: 0,
    overflow: "hidden",
  },
  camera: {
    width: "100%",
    height: 240,
  },
  manualCard: {
    gap: 10,
  },
  listWrap: {
    gap: 10,
  },
});
