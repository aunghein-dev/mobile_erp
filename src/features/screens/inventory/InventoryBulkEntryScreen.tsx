import React, { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import Toast from "react-native-toast-message";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/shared/components/layout/Screen";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { useSubmitStockEntry } from "@/features/hooks/inventory/useStocks";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getErrorMessage } from "@/shared/lib/api/errors";
import {
  createTier,
  createVariant,
  normalizeColorHex,
  type VariantDraft,
  type WholesaleTierDraft,
} from "./inventoryBulkEntryUtils";
import { styles } from "./inventoryBulkEntryStyles";
import { InventoryBulkEntryHero } from "./components/InventoryBulkEntryHero";

async function appendStockJsonPart(formData: FormData, payload: Record<string, unknown>) {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory is unavailable");
  }
  const jsonUri = `${cacheDir}stock-json-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  await FileSystem.writeAsStringAsync(jsonUri, JSON.stringify(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  formData.append("json", {
    uri: jsonUri,
    name: "stock-group.json",
    type: "application/json",
  } as unknown as Blob);
  return jsonUri;
}

export default function InventoryBulkEntryScreen() {
  const theme = useTheme();
  const submit = useSubmitStockEntry();
  const bizId = useBusinessStore((s) => s.bizId);

  const [groupName, setGroupName] = useState("");
  const [groupUnitPrice, setGroupUnitPrice] = useState("0");
  const [groupOriginalPrice, setGroupOriginalPrice] = useState("0");
  const [releasedDate, setReleasedDate] = useState(new Date().toISOString().slice(0, 10));
  const [isColorless, setIsColorless] = useState(false);
  const [groupImageUri, setGroupImageUri] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantDraft[]>([createVariant()]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTierDraft[]>([]);

  const isValidReleaseDate = /^\d{4}-\d{2}-\d{2}$/.test(releasedDate.trim());
  const hasValidPrice = Number(groupUnitPrice) > 0;
  const hasValidGroupName = Boolean(groupName.trim());
  const hasGroupImage = Boolean(groupImageUri);

  const variantUnits = useMemo(() => {
    return variants.reduce((sum, entry) => sum + Number(entry.itemQuantity || 0), 0);
  }, [variants]);

  const isVariantReady = (entry: VariantDraft) => {
    if (!entry.barcodeNo.trim()) return false;
    if (entry.itemQuantity <= 0) return false;
    if (!isColorless && !entry.imageUri) return false;
    return true;
  };

  const readyVariantCount = useMemo(() => {
    return variants.filter((entry) => isVariantReady(entry)).length;
  }, [variants, isColorless]);

  const validTierCount = useMemo(() => {
    return wholesaleTiers.filter((tier) => tier.minQuantity > 0 && tier.price > 0).length;
  }, [wholesaleTiers]);

  const completionRate = useMemo(() => {
    const checks = [
      hasValidGroupName,
      hasValidPrice,
      hasGroupImage,
      isValidReleaseDate,
      variants.length > 0 && readyVariantCount === variants.length,
      wholesaleTiers.length === 0 || validTierCount === wholesaleTiers.length,
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }, [
    hasValidGroupName,
    hasValidPrice,
    hasGroupImage,
    isValidReleaseDate,
    variants.length,
    readyVariantCount,
    wholesaleTiers.length,
    validTierCount,
  ]);

  const canSubmit = useMemo(() => {
    if (!hasValidGroupName) return false;
    if (!hasGroupImage) return false;
    if (!hasValidPrice) return false;
    if (!isValidReleaseDate) return false;
    if (!variants.length) return false;
    if (
      wholesaleTiers.some((tier) => {
        return tier.minQuantity <= 0 || tier.price <= 0;
      })
    ) {
      return false;
    }

    return variants.every((entry) => isVariantReady(entry));
  }, [
    hasValidGroupName,
    hasGroupImage,
    hasValidPrice,
    isValidReleaseDate,
    variants,
    wholesaleTiers,
    isColorless,
  ]);

  const pickImage = async (onSelect: (uri: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission required",
        text2: "Photo library access is needed for image upload.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    onSelect(result.assets[0].uri);
  };

  const updateVariant = (id: string, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const addVariant = () => {
    setVariants((current) => [...current, createVariant()]);
  };

  const duplicateVariant = (id: string) => {
    setVariants((current) => {
      const index = current.findIndex((entry) => entry.id === id);
      if (index < 0) return current;
      const original = current[index];
      const base = createVariant();
      const copy: VariantDraft = {
        ...original,
        id: base.id,
        barcodeNo: "",
      };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  };

  const removeVariant = (id: string) => {
    setVariants((current) => current.filter((entry) => entry.id !== id));
  };

  const addTier = () => {
    setWholesaleTiers((current) => [...current, createTier()]);
  };

  const updateTier = (id: string, patch: Partial<WholesaleTierDraft>) => {
    setWholesaleTiers((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const removeTier = (id: string) => {
    setWholesaleTiers((current) => current.filter((entry) => entry.id !== id));
  };

  const resetForm = () => {
    setGroupName("");
    setGroupUnitPrice("0");
    setGroupOriginalPrice("0");
    setReleasedDate(new Date().toISOString().slice(0, 10));
    setIsColorless(false);
    setGroupImageUri(null);
    setVariants([createVariant()]);
    setWholesaleTiers([]);
  };

  const submitEntry = async () => {
    if (!bizId || !canSubmit || !groupImageUri) return;

    const formData = new FormData();
    let jsonTempUri: string | null = null;

    formData.append("groupImage", {
      uri: groupImageUri,
      name: `group-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as unknown as Blob);

    variants.forEach((entry, index) => {
      if (isColorless || !entry.imageUri) return;
      formData.append("itemImages", {
        uri: entry.imageUri,
        name: `item-${index}-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);
    });

    const payload = {
      groupName: groupName.trim(),
      groupUnitPrice: Number(groupUnitPrice),
      releasedDate,
      isColorless,
      groupOriginalPrice: Number(groupOriginalPrice),
      items: variants.map((entry) => ({
        itemColorHex: entry.itemColorHex,
        itemQuantity: Number(entry.itemQuantity),
        barcodeNo: entry.barcodeNo.trim(),
        sizing: entry.sizing.trim(),
        subPrice: Number(entry.subPrice || 0),
      })),
      wholesalePrices: wholesaleTiers.map((entry) => ({
        minQuantity: Number(entry.minQuantity || 0),
        price: Number(entry.price || 0),
      })),
      shopId: 0,
    };

    try {
      jsonTempUri = await appendStockJsonPart(formData, payload);
      await submit.mutateAsync(formData);
      Toast.show({
        type: "success",
        text1: "Stock entry created",
        text2: `${groupName} added to inventory`,
      });
      resetForm();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to submit",
        text2: getErrorMessage(error, "Unable to create stock entry"),
      });
    } finally {
      if (jsonTempUri) {
        try {
          await FileSystem.deleteAsync(jsonTempUri, { idempotent: true });
        } catch {}
      }
    }
  };

  return (
    <Screen>
      <SectionTitle
        title="New Stock Entry"
        subtitle={bizId ? `Business #${bizId}` : "No business selected"}
      />

      <InventoryBulkEntryHero
        onReset={resetForm}
        variantsCount={variants.length}
        tiersCount={wholesaleTiers.length}
        variantUnits={variantUnits}
        canSubmit={canSubmit}
        completionRate={completionRate}
        hasValidGroupName={hasValidGroupName}
        hasGroupImage={hasGroupImage}
        validTierCount={validTierCount}
        readyVariantCount={readyVariantCount}
      />

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="shape-outline" size={15} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Group Details</Text>
          </View>
          <View
            style={[
              styles.sectionStateBadge,
              {
                borderColor: hasValidGroupName && hasValidPrice && hasGroupImage && isValidReleaseDate ? `${theme.success}45` : `${theme.warning}45`,
                backgroundColor: hasValidGroupName && hasValidPrice && hasGroupImage && isValidReleaseDate ? `${theme.success}12` : `${theme.warning}12`,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionStateBadgeText,
                {
                  color:
                    hasValidGroupName && hasValidPrice && hasGroupImage && isValidReleaseDate
                      ? theme.success
                      : theme.warning,
                },
              ]}
            >
              {hasValidGroupName && hasValidPrice && hasGroupImage && isValidReleaseDate
                ? "Ready"
                : "Needs Input"}
            </Text>
          </View>
        </View>

        <AppInput label="Group Name" value={groupName} onChangeText={setGroupName} />

        <View style={styles.row2}>
          <AppInput
            label="Unit Price"
            keyboardType="decimal-pad"
            value={groupUnitPrice}
            onChangeText={setGroupUnitPrice}
            style={styles.flexInput}
          />
          <AppInput
            label="Original Price"
            keyboardType="decimal-pad"
            value={groupOriginalPrice}
            onChangeText={setGroupOriginalPrice}
            style={styles.flexInput}
          />
        </View>

        <AppInput
          label="Release Date"
          value={releasedDate}
          onChangeText={setReleasedDate}
          helperText={isValidReleaseDate ? "YYYY-MM-DD" : "Use format YYYY-MM-DD"}
        />

        <AppPressable
          accessibilityRole="button"
          accessibilityLabel="Colorless group toggle"
          accessibilityHint="Enable if this product group does not use color variants"
          style={[
            styles.toggleWrap,
            {
              borderColor: theme.border,
              backgroundColor: theme.cardSoft,
            },
          ]}
          onPress={() => setIsColorless((value) => !value)}
        >
          <View style={styles.toggleLabelWrap}>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Colorless Group</Text>
            <Text style={[styles.toggleCaption, { color: theme.muted }]}>Skip variant image requirement for all items.</Text>
          </View>
          <View
            style={[
              styles.toggleBadge,
              {
                borderColor: isColorless ? `${theme.success}50` : `${theme.border}`,
                backgroundColor: isColorless ? `${theme.success}12` : theme.card,
              },
            ]}
          >
            <Text style={[styles.toggleBadgeText, { color: isColorless ? theme.success : theme.muted }]}>
              {isColorless ? "Enabled" : "Disabled"}
            </Text>
          </View>
        </AppPressable>

        <AppPressable
          accessibilityRole="button"
          accessibilityLabel="Pick group image"
          accessibilityHint="Opens your photo library to select a group image"
          style={[
            styles.imagePicker,
            {
              borderColor: theme.border,
              backgroundColor: theme.cardSoft,
            },
          ]}
          onPress={() => void pickImage(setGroupImageUri)}
        >
          {groupImageUri ? (
            <Image source={{ uri: groupImageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-plus" size={20} color={theme.muted} />
              <Text style={[styles.imagePlaceholderText, { color: theme.muted }]}>Tap to select group image</Text>
            </View>
          )}
        </AppPressable>
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="layers-outline" size={15} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Wholesale Tiers</Text>
          </View>
          <AppButton label="Add Tier" variant="secondary" onPress={addTier} />
        </View>

        {!wholesaleTiers.length ? (
          <Text style={[styles.helperText, { color: theme.muted }]}>No tiers configured. Add quantity-based pricing if needed.</Text>
        ) : (
          <View style={styles.tierList}>
            {wholesaleTiers.map((tier, index) => (
              <View
                key={tier.id}
                style={[
                  styles.tierRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.cardSoft,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Tier {index + 1}</Text>
                  <View
                    style={[
                      styles.tierStateBadge,
                      {
                        borderColor: tier.minQuantity > 0 && tier.price > 0 ? `${theme.success}45` : `${theme.warning}45`,
                        backgroundColor: tier.minQuantity > 0 && tier.price > 0 ? `${theme.success}12` : `${theme.warning}12`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierStateBadgeText,
                        { color: tier.minQuantity > 0 && tier.price > 0 ? theme.success : theme.warning },
                      ]}
                    >
                      {tier.minQuantity > 0 && tier.price > 0 ? "Valid" : "Invalid"}
                    </Text>
                  </View>
                  <AppButton
                    label="Remove"
                    variant="secondary"
                    onPress={() => removeTier(tier.id)}
                    style={styles.tierRemoveBtn}
                  />
                </View>

                <View style={styles.row2Bottom}>
                  <AppInput
                    label="Min Qty"
                    keyboardType="number-pad"
                    value={String(tier.minQuantity)}
                    onChangeText={(value) => updateTier(tier.id, { minQuantity: Number(value || 0) })}
                    style={styles.flexInput}
                  />
                  <AppInput
                    label="Tier Price"
                    keyboardType="decimal-pad"
                    value={String(tier.price)}
                    onChangeText={(value) => updateTier(tier.id, { price: Number(value || 0) })}
                    style={styles.flexInput}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {variants.map((entry, index) => (
        <Card key={entry.id} style={styles.variantCard}>
          <View style={styles.variantHead}>
            <View style={styles.variantNameWrap}>
              <Text style={[styles.variantName, { color: theme.text }]}>Variant {index + 1}</Text>
              <Text style={[styles.variantCaption, { color: theme.muted }]}>Configure barcode, size, quantity, color, and image.</Text>
            </View>

            <View
              style={[
                styles.variantStateBadge,
                {
                  borderColor: isVariantReady(entry) ? `${theme.success}45` : `${theme.warning}45`,
                  backgroundColor: isVariantReady(entry) ? `${theme.success}12` : `${theme.warning}12`,
                },
              ]}
            >
              <Text style={[styles.variantStateBadgeText, { color: isVariantReady(entry) ? theme.success : theme.warning }]}>
                {isVariantReady(entry) ? "Ready" : "Incomplete"}
              </Text>
            </View>
            <View
              style={[
                styles.variantColorPreview,
                {
                  borderColor: theme.border,
                  backgroundColor: normalizeColorHex(entry.itemColorHex),
                },
              ]}
            />
          </View>

          <View style={styles.row2}>
            <AppInput
              label="Barcode"
              value={entry.barcodeNo}
              onChangeText={(value) => updateVariant(entry.id, { barcodeNo: value })}
              style={styles.flexInput}
            />
            <AppInput
              label="Size"
              value={entry.sizing}
              onChangeText={(value) => updateVariant(entry.id, { sizing: value })}
              style={styles.flexInput}
            />
          </View>

          <View style={styles.row2}>
            <AppInput
              label="Quantity"
              keyboardType="number-pad"
              value={String(entry.itemQuantity)}
              onChangeText={(value) => updateVariant(entry.id, { itemQuantity: Number(value || 0) })}
              style={styles.flexInput}
            />
            <AppInput
              label="Sub Price"
              keyboardType="decimal-pad"
              value={String(entry.subPrice)}
              onChangeText={(value) => updateVariant(entry.id, { subPrice: Number(value || 0) })}
              style={styles.flexInput}
            />
          </View>

          <AppInput
            label="Color Hex"
            value={entry.itemColorHex}
            onChangeText={(value) => updateVariant(entry.id, { itemColorHex: value })}
            helperText="Example: #1A73E8"
          />

          {!isColorless ? (
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`Pick image for variant ${index + 1}`}
              accessibilityHint="Opens your photo library to select the variant image"
              style={[
                styles.variantImagePicker,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.cardSoft,
                },
              ]}
              onPress={() => void pickImage((uri) => updateVariant(entry.id, { imageUri: uri }))}
            >
              {entry.imageUri ? (
                <Image source={{ uri: entry.imageUri }} style={styles.variantImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={20} color={theme.muted} />
                  <Text style={[styles.imagePlaceholderText, { color: theme.muted }]}>Tap to select variant image</Text>
                </View>
              )}
            </AppPressable>
          ) : null}

          <View style={styles.variantActionRow}>
            <AppButton
              label="Duplicate"
              variant="secondary"
              leftIcon={<MaterialCommunityIcons name="content-copy" size={14} color={theme.text} />}
              onPress={() => duplicateVariant(entry.id)}
              style={styles.flexInput}
            />
            <AppButton
              label="Remove"
              variant="danger"
              onPress={() => removeVariant(entry.id)}
              disabled={variants.length <= 1}
              style={styles.flexInput}
            />
          </View>
        </Card>
      ))}

      <Card style={styles.actionCard}>
        <View style={styles.actionRow}>
          <AppButton label="Add Variant" variant="secondary" onPress={addVariant} style={styles.flexInput} />
          <AppButton label="Reset Form" variant="secondary" onPress={resetForm} style={styles.flexInput} />
        </View>

        <AppButton
          label={submit.isPending ? "Saving..." : "Submit Entry"}
          onPress={submitEntry}
          disabled={!canSubmit || submit.isPending}
          loading={submit.isPending}
        />

        <View
          style={[
            styles.submitStateBadge,
            {
              borderColor: canSubmit ? `${theme.success}45` : `${theme.warning}45`,
              backgroundColor: canSubmit ? `${theme.success}12` : `${theme.warning}12`,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={canSubmit ? "check-circle-outline" : "information-outline"}
            size={14}
            color={canSubmit ? theme.success : theme.warning}
          />
          <Text style={[styles.submitStateBadgeText, { color: canSubmit ? theme.success : theme.warning }]}>
            {canSubmit ? "Form is ready to submit" : "Complete required fields to submit"}
          </Text>
        </View>

        <Text style={[styles.helperText, { color: theme.muted }]}>
          Required: group name, group image, unit price, barcode + quantity per variant, and images when not colorless.
        </Text>
      </Card>
    </Screen>
  );
}
