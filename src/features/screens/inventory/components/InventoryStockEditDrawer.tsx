import React from "react";
import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DrawerSheet } from "@/shared/components/ui/DrawerSheet";
import { Card } from "@/shared/components/ui/Card";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../inventoryStocksStyles";
import { normalizeColorHex, type EditableStockItem, type StockEditDraft } from "../inventoryStocksUtils";

type InventoryStockEditDrawerProps = {
  visible: boolean;
  editDraft: StockEditDraft | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  updateDraft: (patch: Partial<StockEditDraft>) => void;
  updateDraftItem: (itemId: number, patch: Partial<EditableStockItem>) => void;
  addDraftTier: () => void;
  updateDraftTier: (index: number, field: "minQuantity" | "price", value: number) => void;
  removeDraftTier: (index: number) => void;
};

export function InventoryStockEditDrawer({
  visible,
  editDraft,
  saving,
  onClose,
  onSave,
  updateDraft,
  updateDraftItem,
  addDraftTier,
  updateDraftTier,
  removeDraftTier,
}: InventoryStockEditDrawerProps) {
  const theme = useTheme();

  return (
    <DrawerSheet visible={visible} onClose={onClose} sheetStyle={[styles.drawerCard, { borderColor: theme.border }]}>
      <ScrollView
        style={styles.drawerScroll}
        contentContainerStyle={styles.drawerScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.drawerHeaderRow}>
          <View
            style={[
              styles.drawerIconWrap,
              {
                backgroundColor: `${theme.primary}14`,
                borderColor: `${theme.primary}35`,
              },
            ]}
          >
            <MaterialCommunityIcons name="cube-outline" size={18} color={theme.primary} />
          </View>
          <View style={styles.drawerTitleWrap}>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>Edit Stock Group</Text>
            <Text style={[styles.drawerSubtitle, { color: theme.muted }]}>
              Group #{editDraft?.groupId ?? ""} • {editDraft?.items.length ?? 0} variants
            </Text>
          </View>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Group Details</Text>
            <Text style={[styles.sectionCaption, { color: theme.muted }]}>Core pricing and release info</Text>
          </View>

          <AppInput
            label="Group Name"
            value={editDraft?.groupName ?? ""}
            onChangeText={(groupName) => updateDraft({ groupName })}
          />

          <View style={styles.row2}>
            <AppInput
              label="Unit Price"
              keyboardType="decimal-pad"
              value={editDraft?.groupUnitPrice ?? ""}
              onChangeText={(groupUnitPrice) => updateDraft({ groupUnitPrice })}
              style={styles.flexInput}
            />
            <AppInput
              label="Original Price"
              keyboardType="decimal-pad"
              value={editDraft?.groupOriginalPrice ?? ""}
              onChangeText={(groupOriginalPrice) => updateDraft({ groupOriginalPrice })}
              style={styles.flexInput}
            />
          </View>

          <AppInput
            label="Release Date"
            value={editDraft?.releasedDate ?? ""}
            onChangeText={(releasedDate) => updateDraft({ releasedDate })}
            helperText="YYYY-MM-DD"
          />

          <AppButton
            label={editDraft?.isColorless ? "Colorless Group: Enabled" : "Colorless Group: Disabled"}
            variant="secondary"
            onPress={() => updateDraft({ isColorless: !editDraft?.isColorless })}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Wholesale Tiers</Text>
            <Text style={[styles.sectionCaption, { color: theme.muted }]}>
              {editDraft?.wholesalePrices.length ? `${editDraft.wholesalePrices.length} tier(s)` : "No tiers"}
            </Text>
          </View>

          {!editDraft?.wholesalePrices.length ? (
            <Text style={[styles.sectionCaption, { color: theme.muted }]}>Add tiered pricing by minimum quantity.</Text>
          ) : (
            editDraft.wholesalePrices.map((tier, index) => (
              <View key={`${tier.id ?? "new"}-${index}`} style={styles.tierRow}>
                <AppInput
                  label={`Tier ${index + 1} Qty`}
                  keyboardType="number-pad"
                  value={String(tier.minQuantity ?? 0)}
                  onChangeText={(value) => updateDraftTier(index, "minQuantity", Number(value || 0))}
                  style={styles.flexInput}
                />
                <AppInput
                  label="Tier Price"
                  keyboardType="decimal-pad"
                  value={String(tier.price ?? 0)}
                  onChangeText={(value) => updateDraftTier(index, "price", Number(value || 0))}
                  style={styles.flexInput}
                />
                <AppButton
                  label="Remove"
                  variant="secondary"
                  onPress={() => removeDraftTier(index)}
                  style={styles.tierRemoveBtn}
                />
              </View>
            ))
          )}

          <AppButton label="Add Tier" variant="secondary" onPress={addDraftTier} />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Variants</Text>
            <Text style={[styles.sectionCaption, { color: theme.muted }]}>Edit size, stock, barcode, and color</Text>
          </View>

          <View style={styles.variantEditList}>
            {(editDraft?.items ?? []).map((item) => (
              <View
                key={item.itemId}
                style={[
                  styles.variantEditCard,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <View style={styles.variantEditHeader}>
                  <Text style={[styles.variantEditTitle, { color: theme.text }]}>Variant #{item.itemId}</Text>
                  <View style={[styles.variantEditQtyChip, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    <Text style={[styles.variantEditQtyChipText, { color: theme.muted }]}>Qty {item.itemQuantity}</Text>
                  </View>
                </View>

                <View style={styles.variantEditBody}>
                  <View style={styles.row2}>
                    <AppInput
                      label="Barcode"
                      value={item.barcodeNo}
                      onChangeText={(barcodeNo) => updateDraftItem(item.itemId, { barcodeNo })}
                      style={styles.flexInput}
                    />
                    <AppInput
                      label="Size"
                      value={item.sizing}
                      onChangeText={(sizing) => updateDraftItem(item.itemId, { sizing })}
                      style={styles.flexInput}
                    />
                  </View>

                  <View style={styles.row2}>
                    <AppInput
                      label="Quantity"
                      keyboardType="number-pad"
                      value={item.itemQuantity}
                      onChangeText={(itemQuantity) => updateDraftItem(item.itemId, { itemQuantity })}
                      style={styles.flexInput}
                    />
                    <AppInput
                      label="Sub Price"
                      keyboardType="decimal-pad"
                      value={item.subPrice}
                      onChangeText={(subPrice) => updateDraftItem(item.itemId, { subPrice })}
                      style={styles.flexInput}
                    />
                  </View>

                  <View style={styles.variantEditColorRow}>
                    <AppInput
                      label="Color Hex"
                      value={item.itemColorHex}
                      onChangeText={(itemColorHex) => updateDraftItem(item.itemId, { itemColorHex })}
                      style={styles.flexInput}
                    />
                    <View
                      style={[
                        styles.colorDot,
                        {
                          borderColor: theme.border,
                          backgroundColor: normalizeColorHex(item.itemColorHex),
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.drawerActionsRow}>
          <AppButton label="Cancel" variant="secondary" onPress={onClose} style={styles.flexInput} />
          <AppButton label={saving ? "Saving..." : "Save Changes"} onPress={onSave} loading={saving} style={styles.flexInput} />
        </View>
      </ScrollView>
    </DrawerSheet>
  );
}
