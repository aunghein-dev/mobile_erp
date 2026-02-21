import React from "react";
import { Image, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "@/shared/components/ui/Card";
import { AppButton } from "@/shared/components/ui/AppButton";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatDate } from "@/shared/lib/utils/format";
import type { StockGroup, StockItem } from "@/shared/types/stock";
import {
  normalizeColorHex,
  normalizeImageUrl,
  resolveVariantPrice,
  summarizeGroup,
  toSafeNumber,
} from "../inventoryStocksUtils";
import { styles } from "../inventoryStocksStyles";

type InventoryStockCardProps = {
  group: StockGroup;
  selectedBase: string;
  displayMoney: (amount: number, base?: string) => string;
  mutating: boolean;
  onEdit: (groupId: number) => void;
  onDeleteGroup: (group: StockGroup) => void;
  onDeleteVariant: (group: StockGroup, item: StockItem) => void;
};

export function InventoryStockCard({
  group,
  selectedBase,
  displayMoney,
  mutating,
  onEdit,
  onDeleteGroup,
  onDeleteVariant,
}: InventoryStockCardProps) {
  const theme = useTheme();

  const summary = summarizeGroup(group);
  const unitPrice = toSafeNumber(group.groupUnitPrice);
  const originalPrice = toSafeNumber(group.groupOriginalPrice);
  const margin = unitPrice - originalPrice;
  const imageUri =
    normalizeImageUrl(group.groupImage) ||
    normalizeImageUrl(group.items.find((variant) => normalizeImageUrl(variant.itemImage))?.itemImage);

  return (
    <Card style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View
          style={[
            styles.imageWrap,
            {
              borderColor: theme.border,
              backgroundColor: theme.cardSoft,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.groupImage} />
          ) : (
            <MaterialCommunityIcons name="image-off-outline" size={22} color={theme.muted} />
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
            {group.groupName}
          </Text>

          <View style={styles.groupMetaRow}>
            <View
              style={[
                styles.metaBadge,
                {
                  borderColor: `${theme.primary}35`,
                  backgroundColor: `${theme.primary}10`,
                },
              ]}
            >
              <Text style={[styles.metaBadgeText, { color: theme.primary }]}>Group #{group.groupId}</Text>
            </View>
            <View
              style={[
                styles.metaBadge,
                {
                  borderColor: `${theme.border}CC`,
                  backgroundColor: theme.cardSoft,
                },
              ]}
            >
              <Text style={[styles.metaBadgeText, { color: theme.muted }]}>Released {formatDate(group.releasedDate)}</Text>
            </View>
          </View>

          <View style={styles.groupMetaRow}>
            <View
              style={[
                styles.metaBadge,
                {
                  borderColor: `${theme.accent}35`,
                  backgroundColor: `${theme.accent}10`,
                },
              ]}
            >
              <Text style={[styles.metaBadgeText, { color: theme.accent }]}>Tier {group.wholesalePrices.length}</Text>
            </View>

            <View
              style={[
                styles.metaBadge,
                {
                  borderColor: `${theme.success}35`,
                  backgroundColor: `${theme.success}10`,
                },
              ]}
            >
              <QuantityBadge
                value={summary.totalQty}
                prefix="Qty"
                tone={summary.totalQty > 0 ? "success" : "warning"}
                compact
              />
            </View>

            <View
              style={[
                styles.metaBadge,
                {
                  borderColor: `${theme.warning}35`,
                  backgroundColor: `${theme.warning}10`,
                },
              ]}
            >
              <Text style={[styles.metaBadgeText, { color: theme.warning }]}>Variants {summary.variantCount}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.priceGrid}>
        <View
          style={[
            styles.priceCell,
            {
              borderColor: `${theme.primary}40`,
              backgroundColor: `${theme.primary}12`,
            },
          ]}
        >
          <Text style={[styles.priceLabel, { color: theme.primary }]}>Unit Price</Text>
          <Text style={[styles.priceValue, { color: theme.primary }]}>{displayMoney(unitPrice, selectedBase)}</Text>
        </View>

        <View
          style={[
            styles.priceCell,
            {
              borderColor: `${theme.warning}40`,
              backgroundColor: `${theme.warning}12`,
            },
          ]}
        >
          <Text style={[styles.priceLabel, { color: theme.warning }]}>Original</Text>
          <Text style={[styles.priceValue, { color: theme.warning }]}>{displayMoney(originalPrice, selectedBase)}</Text>
        </View>

        <View
          style={[
            styles.priceCell,
            {
              borderColor: margin >= 0 ? `${theme.success}40` : `${theme.danger}40`,
              backgroundColor: margin >= 0 ? `${theme.success}12` : `${theme.danger}12`,
            },
          ]}
        >
          <Text style={[styles.priceLabel, { color: margin >= 0 ? theme.success : theme.danger }]}>
            {margin >= 0 ? "Margin" : "Loss"}
          </Text>
          <Text style={[styles.priceValue, { color: margin >= 0 ? theme.success : theme.danger }]}>
            {displayMoney(Math.abs(margin), selectedBase)}
          </Text>
        </View>
      </View>

      <View style={styles.variantList}>
        {group.items.map((variant) => {
          const quantity = toSafeNumber(variant.itemQuantity);
          const lowStock = quantity <= 3;
          const variantPrice = resolveVariantPrice(group, variant);
          const variantImageUri = normalizeImageUrl(variant.itemImage) || imageUri;

          return (
            <View
              key={`${group.groupId}-${variant.itemId}`}
              style={[
                styles.variantRow,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.cardSoft,
                },
              ]}
            >
              <View style={styles.variantTopRow}>
                <View style={styles.variantIdentity}>
                  <View
                    style={[
                      styles.variantImageWrap,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                      },
                    ]}
                  >
                    {variantImageUri ? (
                      <Image source={{ uri: variantImageUri }} style={styles.variantImage} />
                    ) : (
                      <MaterialCommunityIcons name="image-off-outline" size={14} color={theme.muted} />
                    )}
                  </View>
                  <View
                    style={[
                      styles.colorDot,
                      {
                        borderColor: theme.border,
                        backgroundColor: normalizeColorHex(variant.itemColorHex),
                      },
                    ]}
                  />
                  <Text style={[styles.variantTitle, { color: theme.text }]} numberOfLines={1}>
                    {variant.sizing?.trim() || `Item #${variant.itemId}`}
                  </Text>
                </View>

                <QuantityBadge
                  value={quantity}
                  suffix="in stock"
                  tone={lowStock ? "warning" : "success"}
                  compact
                  style={styles.qtyValueBadge}
                />
              </View>

              <View style={styles.variantBottomRow}>
                <Text style={[styles.barcodeText, { color: theme.muted }]} numberOfLines={1}>
                  #{variant.itemId} • {variant.barcodeNo || "-"}
                </Text>
                <Text style={[styles.variantPrice, { color: theme.primary }]}>{displayMoney(variantPrice, selectedBase)}</Text>
              </View>

              <AppButton
                label="Delete Variant"
                variant="secondary"
                leftIcon={<MaterialCommunityIcons name="trash-can-outline" size={14} color={theme.danger} />}
                disabled={mutating}
                onPress={() => onDeleteVariant(group, variant)}
                style={styles.variantActionBtn}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.cardActionRow}>
        <AppButton
          label="Edit Group"
          variant="secondary"
          onPress={() => onEdit(group.groupId)}
          disabled={mutating}
          style={styles.cardActionBtn}
        />
        <AppButton
          label="Delete Group"
          variant="danger"
          onPress={() => onDeleteGroup(group)}
          disabled={mutating}
          style={styles.cardActionBtn}
        />
      </View>
    </Card>
  );
}
