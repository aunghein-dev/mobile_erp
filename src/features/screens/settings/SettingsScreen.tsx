import React, { useEffect, useMemo, useState } from "react";
import { DevSettings, Image, StyleSheet, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { LoadingState, ErrorState } from "@/shared/components/ui/StateViews";
import { useInfo } from "@/features/hooks/business/useInfo";
import { useCurrency } from "@/features/hooks/business/useCurrency";
import { useTranslation } from "@/features/hooks/useTranslation";
import { useCurrencyStore } from "@/shared/store/useCurrencyStore";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { api } from "@/shared/lib/api/client";
import { formatDateTime } from "@/shared/lib/utils/format";
import { routes } from "@/shared/lib/api/routes";
import { getErrorMessage } from "@/shared/lib/api/errors";

type BusinessSettings = {
  businessId: number;
  businessLogo: string;
  businessName: string;
  businessNameShortForm: string;
  registeredBy: string;
  registeredAt: string;
  defaultCurrency: string;
  taxRate: number;
  showLogoOnInvoice: boolean;
  autoPrintAfterCheckout: boolean;
  invoiceFooterMessage: string;
  usdRate: number;
  thbRate: number;
};

const LANGUAGE_CHOICES = ["en", "my"] as const;

function toSafeNumber(value: string) {
  const trimmed = value.replace(/,/g, "").trim();
  if (!trimmed) return 0;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeDefaultCurrency(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase() === "THB" ? "THB" : "MMK";
}

function ToggleRow({
  label,
  value,
  onToggle,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <AppPressable
      style={({ pressed }) => [styles.toggleRow, { opacity: disabled ? 0.55 : pressed ? 0.82 : 1 }]}
      onPress={onToggle}
      disabled={disabled}
    >
      <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.toggleTrack,
          {
            backgroundColor: value ? `${theme.primary}45` : theme.border,
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

export default function SettingsScreen() {
  const theme = useTheme();
  const { business, isLoading, error, refresh } = useInfo();
  const { selectedBase, availableBases, setBase } = useCurrency();
  const { locale, setLocale } = useTranslation();
  const fetchCurrency = useCurrencyStore((s) => s.fetchCurrency);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<BusinessSettings | null>(null);
  const [selectedLogoUri, setSelectedLogoUri] = useState<string | null>(null);
  const [selectedLogoType, setSelectedLogoType] = useState<string>("image/jpeg");
  const [selectedLogoName, setSelectedLogoName] = useState<string>("");

  useEffect(() => {
    if (!business) return;

    const loaded: BusinessSettings = {
      businessId: business.businessId,
      businessLogo: business.businessLogo || "",
      businessName: business.businessName || "",
      businessNameShortForm: business.businessNameShortForm || "",
      registeredBy: business.registeredBy || "",
      registeredAt: business.registeredAt || "",
      defaultCurrency: sanitizeDefaultCurrency(business.defaultCurrency),
      taxRate: Number(business.taxRate ?? 0),
      showLogoOnInvoice: Boolean(business.showLogoOnInvoice),
      autoPrintAfterCheckout: Boolean(business.autoPrintAfterCheckout),
      invoiceFooterMessage: business.invoiceFooterMessage || "",
      usdRate: Number(business.usdRate ?? 0),
      thbRate: Number(business.thbRate ?? 0),
    };
    setSettings(loaded);
    setInitialSettings(loaded);
  }, [business]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      await api.put(routes.business.editInfo(settings.businessId), settings, {
        withCredentials: true,
      });
      await Promise.all([
        fetchCurrency(settings.businessId, { force: true }),
        refresh(),
      ]);
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async () => {
      if (!settings?.businessId || !selectedLogoUri) return;

      const formData = new FormData();
      formData.append("logo", {
        uri: selectedLogoUri,
        name: selectedLogoName || `logo-${Date.now()}.jpg`,
        type: selectedLogoType,
      } as unknown as Blob);

      const response = await api.put(routes.business.uploadLogo(settings.businessId), formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data as { logoUrl?: string };
    },
    onSuccess: (data) => {
      if (!settings) return;
      const nextSettings = {
        ...settings,
        businessLogo: data?.logoUrl ?? settings.businessLogo,
      };
      setSettings(nextSettings);
      setInitialSettings((prev) => (prev ? { ...prev, businessLogo: nextSettings.businessLogo } : nextSettings));
      setSelectedLogoUri(null);
      setSelectedLogoName("");
      void refresh();
    },
  });

  const hasChanges = useMemo(() => {
    if (!settings || !initialSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings]);

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission required",
        text2: "Photo library access is needed for logo upload.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const fileSize = Number(asset.fileSize ?? 0);
    if (fileSize > 10 * 1024 * 1024) {
      Toast.show({
        type: "error",
        text1: "Logo too large",
        text2: "Please select an image under 10MB.",
      });
      return;
    }

    setSelectedLogoUri(asset.uri);
    setSelectedLogoType(asset.mimeType || "image/jpeg");
    setSelectedLogoName(asset.fileName || `logo-${Date.now()}.jpg`);
  };

  const onSave = async () => {
    try {
      await saveSettings.mutateAsync();
      if (settings) {
        setInitialSettings(settings);
      }
      Toast.show({
        type: "success",
        text1: "Settings saved",
      });
    } catch (saveError) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: getErrorMessage(saveError, "Unable to save settings"),
      });
    }
  };

  const onUploadLogo = async () => {
    try {
      await uploadLogo.mutateAsync();
      Toast.show({
        type: "success",
        text1: "Logo uploaded",
      });
    } catch (uploadError) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: getErrorMessage(uploadError, "Unable to upload logo"),
      });
    }
  };

  const onReset = () => {
    if (!initialSettings) return;
    setSettings(initialSettings);
    setSelectedLogoUri(null);
    setSelectedLogoName("");
  };

  const onLanguageChange = (lang: (typeof LANGUAGE_CHOICES)[number]) => {
    if (lang === locale) return;
    setLocale(lang);
    Toast.show({
      type: "success",
      text1: "Language changed",
      text2: "Restarting app to apply translations.",
    });
    setTimeout(() => {
      try {
        DevSettings.reload();
      } catch {}
    }, 160);
  };

  if (isLoading || !settings) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading settings..." variant="form" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Unable to load settings"
          subtitle={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  const displayLogo = selectedLogoUri || settings.businessLogo;

  return (
    <Screen>
      <SectionTitle title="Business Settings" subtitle="Same fields and behavior as web settings" />

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Business Logo</Text>
        <AppPressable
          style={[styles.logoWrap, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
          onPress={() => void pickLogo()}
        >
          {displayLogo ? (
            <Image source={{ uri: displayLogo }} style={styles.logoImage} />
          ) : (
            <Text style={[styles.logoPlaceholder, { color: theme.muted }]}>Tap to select logo</Text>
          )}
        </AppPressable>
        <Text style={[styles.helperText, { color: theme.muted }]}>
          {selectedLogoName || "PNG, JPG, JPEG, GIF up to 10MB"}
        </Text>
        <AppButton
          label={uploadLogo.isPending ? "Uploading..." : "Upload Logo"}
          onPress={onUploadLogo}
          disabled={!selectedLogoUri || uploadLogo.isPending}
          loading={uploadLogo.isPending}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Business Information</Text>
        <AppInput
          label="Business Name"
          value={settings.businessName}
          onChangeText={(value) => setSettings((prev) => (prev ? { ...prev, businessName: value } : prev))}
        />
        <AppInput
          label="Short Name"
          value={settings.businessNameShortForm}
          onChangeText={(value) =>
            setSettings((prev) => (prev ? { ...prev, businessNameShortForm: value } : prev))
          }
        />
        <AppInput
          label="Base Currency"
          value={sanitizeDefaultCurrency(settings.defaultCurrency)}
          editable={false}
          helperText="Base currency follows web/business profile and cannot be edited in mobile."
        />

        <AppInput
          label="Tax Rate (%)"
          keyboardType="decimal-pad"
          value={String(settings.taxRate)}
          onChangeText={(value) =>
            setSettings((prev) => (prev ? { ...prev, taxRate: toSafeNumber(value) } : prev))
          }
          helperText="Example: 5 for 5%"
        />

        <AppInput label="Registered By" value={settings.registeredBy || "N/A"} editable={false} />
        <AppInput
          label="Registered At"
          value={settings.registeredAt ? formatDateTime(settings.registeredAt) : "N/A"}
          editable={false}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Invoice & Receipt Settings</Text>
        <ToggleRow
          label="Show logo on invoice"
          value={settings.showLogoOnInvoice}
          onToggle={() =>
            setSettings((prev) =>
              prev ? { ...prev, showLogoOnInvoice: !prev.showLogoOnInvoice } : prev
            )
          }
        />
        <ToggleRow
          label="Auto print after checkout"
          value={settings.autoPrintAfterCheckout}
          onToggle={() =>
            setSettings((prev) =>
              prev ? { ...prev, autoPrintAfterCheckout: !prev.autoPrintAfterCheckout } : prev
            )
          }
        />
        <AppInput
          label="Invoice Footer Message"
          value={settings.invoiceFooterMessage}
          onChangeText={(value) =>
            setSettings((prev) => (prev ? { ...prev, invoiceFooterMessage: value } : prev))
          }
          maxLength={255}
          helperText="This message appears at the bottom of customer invoices."
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>Currency Rate</Text>
        <AppInput
          label={`${settings.defaultCurrency || "BASE"} → MMK`}
          keyboardType="decimal-pad"
          value={String(settings.thbRate)}
          onChangeText={(value) =>
            setSettings((prev) => (prev ? { ...prev, thbRate: toSafeNumber(value) } : prev))
          }
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>App Preferences</Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Checkout Currency</Text>
          <View style={styles.currencyRow}>
            {availableBases.map((code) => {
              const active = selectedBase === code;
              return (
                <AppPressable
                  key={code}
                  onPress={() => setBase(code)}
                  style={[
                    styles.currencyChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? `${theme.primary}14` : theme.card,
                    },
                  ]}
                >
                  <Text style={[styles.currencyChipText, { color: active ? theme.primary : theme.text }]}>{code}</Text>
                </AppPressable>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Language</Text>
          <View style={styles.currencyRow}>
            {LANGUAGE_CHOICES.map((lang) => {
              const active = locale === lang;
              return (
                <AppPressable
                  key={lang}
                  onPress={() => onLanguageChange(lang)}
                  style={[
                    styles.currencyChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? `${theme.primary}14` : theme.card,
                    },
                  ]}
                >
                  <Text style={[styles.currencyChipText, { color: active ? theme.primary : theme.text }]}>
                    {lang.toUpperCase()}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>User Preferences</Text>
        <ToggleRow label="Enable Sound Effects (Coming Soon)" value={false} onToggle={() => undefined} disabled />
      </Card>

      <View style={styles.actionsRow}>
        <AppButton
          label="Reset"
          variant="secondary"
          onPress={onReset}
          disabled={saveSettings.isPending || !hasChanges}
          style={styles.flexBtn}
        />
        <AppButton
          label={saveSettings.isPending ? "Saving..." : "Save Settings"}
          onPress={onSave}
          loading={saveSettings.isPending}
          disabled={saveSettings.isPending || !hasChanges}
          style={styles.flexBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  logoWrap: {
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    fontSize: 11,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 10,
    fontWeight: "500",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  currencyChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleLabel: {
    flex: 1,
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
});
