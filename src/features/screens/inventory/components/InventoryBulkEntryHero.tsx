import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "@/shared/components/ui/Card";
import { AppButton } from "@/shared/components/ui/AppButton";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../inventoryBulkEntryStyles";

type InventoryBulkEntryHeroProps = {
  onReset: () => void;
  variantsCount: number;
  tiersCount: number;
  variantUnits: number;
  canSubmit: boolean;
  completionRate: number;
  hasValidGroupName: boolean;
  hasGroupImage: boolean;
  validTierCount: number;
  readyVariantCount: number;
};

export function InventoryBulkEntryHero({
  onReset,
  variantsCount,
  tiersCount,
  variantUnits,
  canSubmit,
  completionRate,
  hasValidGroupName,
  hasGroupImage,
  validTierCount,
  readyVariantCount,
}: InventoryBulkEntryHeroProps) {
  const theme = useTheme();

  const groupStepReady = hasValidGroupName && hasGroupImage;
  const tierStepReady = tiersCount === 0 || validTierCount === tiersCount;
  const variantStepReady = variantsCount > 0 && readyVariantCount === variantsCount;

  return (
    <Card style={styles.heroCard}>
      <View style={styles.heroRow}>
        <View style={styles.heroTitleWrap}>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Guided Product Setup</Text>
          <Text style={[styles.heroSubtitle, { color: theme.muted }]}>Add group info, variants, and wholesale tiers.</Text>
        </View>
        <AppButton label="Reset" variant="secondary" onPress={onReset} />
      </View>

      <View style={styles.progressHeader}>
        <Text style={[styles.progressTitle, { color: theme.text }]}>Completion</Text>
        <Text style={[styles.progressValue, { color: canSubmit ? theme.success : theme.warning }]}>
          {completionRate}%
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${completionRate}%`,
              backgroundColor: canSubmit ? theme.success : theme.primary,
            },
          ]}
        />
      </View>

      <View style={styles.stepRow}>
        <View
          style={[
            styles.stepChip,
            {
              borderColor: groupStepReady ? `${theme.success}45` : `${theme.border}`,
              backgroundColor: groupStepReady ? `${theme.success}12` : theme.cardSoft,
            },
          ]}
        >
          <Text style={[styles.stepChipText, { color: groupStepReady ? theme.success : theme.muted }]}>1. Group</Text>
        </View>
        <View
          style={[
            styles.stepChip,
            {
              borderColor: tierStepReady ? `${theme.success}45` : `${theme.border}`,
              backgroundColor: tierStepReady ? `${theme.success}12` : theme.cardSoft,
            },
          ]}
        >
          <Text style={[styles.stepChipText, { color: tierStepReady ? theme.success : theme.muted }]}>2. Tiers</Text>
        </View>
        <View
          style={[
            styles.stepChip,
            {
              borderColor: variantStepReady ? `${theme.success}45` : `${theme.border}`,
              backgroundColor: variantStepReady ? `${theme.success}12` : theme.cardSoft,
            },
          ]}
        >
          <Text style={[styles.stepChipText, { color: variantStepReady ? theme.success : theme.muted }]}>3. Variants</Text>
        </View>
        <View
          style={[
            styles.stepChip,
            {
              borderColor: canSubmit ? `${theme.success}45` : `${theme.border}`,
              backgroundColor: canSubmit ? `${theme.success}12` : theme.cardSoft,
            },
          ]}
        >
          <Text style={[styles.stepChipText, { color: canSubmit ? theme.success : theme.muted }]}>4. Submit</Text>
        </View>
      </View>

      <View style={styles.heroChipRow}>
        <View
          style={[
            styles.chip,
            {
              borderColor: `${theme.primary}3C`,
              backgroundColor: `${theme.primary}12`,
            },
          ]}
        >
          <MaterialCommunityIcons name="cube-outline" size={13} color={theme.primary} />
          <Text style={[styles.chipText, { color: theme.primary }]}>{variantsCount} variants</Text>
        </View>

        <View
          style={[
            styles.chip,
            {
              borderColor: `${theme.accent}3C`,
              backgroundColor: `${theme.accent}12`,
            },
          ]}
        >
          <MaterialCommunityIcons name="layers-triple-outline" size={13} color={theme.accent} />
          <Text style={[styles.chipText, { color: theme.accent }]}>{tiersCount} tiers</Text>
        </View>

        <View
          style={[
            styles.chip,
            {
              borderColor: `${theme.success}3C`,
              backgroundColor: `${theme.success}12`,
            },
          ]}
        >
          <MaterialCommunityIcons name="archive-arrow-up-outline" size={13} color={theme.success} />
          <Text style={[styles.chipText, { color: theme.success }]}>{variantUnits} units</Text>
        </View>

        <View
          style={[
            styles.chip,
            {
              borderColor: canSubmit ? `${theme.success}3C` : `${theme.warning}3C`,
              backgroundColor: canSubmit ? `${theme.success}12` : `${theme.warning}12`,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={canSubmit ? "check-circle-outline" : "alert-outline"}
            size={13}
            color={canSubmit ? theme.success : theme.warning}
          />
          <Text style={[styles.chipText, { color: canSubmit ? theme.success : theme.warning }]}>
            {canSubmit ? "Ready" : "Incomplete"}
          </Text>
        </View>
      </View>
    </Card>
  );
}
