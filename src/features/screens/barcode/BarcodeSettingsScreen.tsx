import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { AppButton } from "@/shared/components/ui/AppButton";
import { useBarcodeSettingsStore } from "@/shared/store/useBarcodeSettingsStore";
import { useTheme } from "@/shared/contexts/ThemeContext";

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();

  return (
    <AppPressable style={styles.toggleRow} onPress={onToggle}>
      <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.toggleTrack,
          {
            backgroundColor: value ? `${theme.primary}40` : `${theme.border}`,
          },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: value ? theme.primary : "#FFFFFF",
              alignSelf: value ? "flex-end" : "flex-start",
            },
          ]}
        />
      </View>
    </AppPressable>
  );
}

export default function BarcodeSettingsScreen() {
  const settings = useBarcodeSettingsStore((s) => s.settings);
  const setSettings = useBarcodeSettingsStore((s) => s.setSettings);
  const resetSettings = useBarcodeSettingsStore((s) => s.resetSettings);

  return (
    <Screen>
      <SectionTitle title="Barcode Settings" subtitle="Saved locally on this device" />

      <Card style={styles.card}>
        <Text style={styles.label}>Label Format</Text>
        <View style={styles.formatRow}>
          {(["CODE_128", "EAN_13", "QR"] as const).map((format) => (
            <AppButton
              key={format}
              label={format}
              variant={settings.barcodeFormat === format ? "primary" : "secondary"}
              onPress={() => setSettings({ barcodeFormat: format })}
              style={styles.formatBtn}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <ToggleRow
          label="Scanner Beep"
          value={settings.scannerBeep}
          onToggle={() => setSettings({ scannerBeep: !settings.scannerBeep })}
        />
        <ToggleRow
          label="Auto Focus"
          value={settings.scannerAutoFocus}
          onToggle={() => setSettings({ scannerAutoFocus: !settings.scannerAutoFocus })}
        />
      </Card>

      <AppButton label="Reset Settings" variant="secondary" onPress={resetSettings} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  formatRow: {
    flexDirection: "row",
    gap: 8,
  },
  formatBtn: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 10,
    padding: 3,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 10,
  },
});
