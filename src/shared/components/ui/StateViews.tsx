import React, { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  DimensionValue,
  Easing,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { brandImages } from "@/shared/assets/branding/images";
import { AppButton } from "./AppButton";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export type LoadingVariant =
  | "list"
  | "cards"
  | "dashboard"
  | "table"
  | "form"
  | "homeProducts";

type SkeletonBlockProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
  shimmerStyle: StyleProp<ViewStyle>;
  baseColor: string;
  highlightColor: string;
  style?: StyleProp<ViewStyle>;
};

function SkeletonBlock({
  width = "100%",
  height,
  radius = 10,
  shimmerStyle,
  baseColor,
  highlightColor,
  style,
}: SkeletonBlockProps) {
  return (
    <View
      style={[
        styles.skeletonBlock,
        {
          width,
          height,
          borderRadius: 10,
          backgroundColor: baseColor,
        },
        style,
      ]}
      accessible={false}
    >
      <AnimatedLinearGradient
        colors={["transparent", highlightColor, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.shimmerOverlay, shimmerStyle]}
      />
    </View>
  );
}

type LoadingStateProps = {
  label?: string;
  variant?: LoadingVariant;
  blocks?: number;
};

function LoadingStateComponent({
  label = "Loading...",
  variant = "list",
  blocks = 5,
}: LoadingStateProps) {
  const theme = useTheme();
  const { height: viewportHeight } = useWindowDimensions();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shimmer.setValue(0);
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [shimmer]);

  const shimmerTranslate = useMemo(
    () =>
      shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-180, 220],
      }),
    [shimmer]
  );

  const shimmerStyle = useMemo(
    () => ({
      transform: [{ translateX: shimmerTranslate }],
    }),
    [shimmerTranslate]
  );

  const baseColor = `${theme.border}80`;
  const highlightColor = `${theme.card}CC`;
  const reservedHeight = useMemo(() => {
    if (variant === "homeProducts") return Math.max(560, Math.round(viewportHeight * 0.84));
    if (variant === "dashboard") return Math.max(480, Math.round(viewportHeight * 0.74));
    return Math.max(380, Math.round(viewportHeight * 0.66));
  }, [variant, viewportHeight]);

  const listRows = useMemo(
    () => Math.min(9, Math.max(4, blocks, Math.ceil((reservedHeight - 72) / 88))),
    [blocks, reservedHeight]
  );
  const cardRows = useMemo(
    () => Math.min(8, Math.max(3, blocks, Math.ceil((reservedHeight - 56) / 130))),
    [blocks, reservedHeight]
  );
  const tableRows = useMemo(
    () => Math.min(10, Math.max(5, blocks, Math.ceil((reservedHeight - 86) / 52))),
    [blocks, reservedHeight]
  );
  const productRows = useMemo(
    () => Math.min(4, Math.max(2, Math.ceil((reservedHeight - 120) / 348))),
    [reservedHeight]
  );

  const renderVariant = () => {
    if (variant === "dashboard") {
      return (
        <>
          <SkeletonBlock height={138} radius={18} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          <View style={styles.row3}>
            <SkeletonBlock height={84} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} style={styles.flex1} />
            <SkeletonBlock height={84} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} style={styles.flex1} />
            <SkeletonBlock height={84} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} style={styles.flex1} />
          </View>
          <SkeletonBlock height={168} radius={16} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          <SkeletonBlock height={148} radius={16} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
        </>
      );
    }

    if (variant === "homeProducts") {
      return (
        <>
          <SkeletonBlock height={106} radius={16} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          {Array.from({ length: productRows }).map((_, index) => (
            <View key={`home-card-${index}`} style={styles.productCard}>
              <SkeletonBlock
                height={190}
                radius={16}
                shimmerStyle={shimmerStyle}
                baseColor={baseColor}
                highlightColor={highlightColor}
              />
              <SkeletonBlock height={22} width="62%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={18} width="42%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={44} radius={12} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
            </View>
          ))}
        </>
      );
    }

    if (variant === "table") {
      return (
        <>
          <SkeletonBlock height={40} radius={10} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          {Array.from({ length: tableRows }).map((_, index) => (
            <View key={`table-row-${index}`} style={styles.tableRow}>
              <SkeletonBlock height={16} width="28%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={16} width="20%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={16} width="20%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={16} width="20%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
            </View>
          ))}
        </>
      );
    }

    if (variant === "form") {
      return (
        <>
          <SkeletonBlock height={120} radius={18} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          <SkeletonBlock height={48} radius={12} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          <SkeletonBlock height={48} radius={12} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          <SkeletonBlock height={48} radius={12} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          <SkeletonBlock height={46} radius={12} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
        </>
      );
    }

    if (variant === "cards") {
      return (
        <>
          {Array.from({ length: cardRows }).map((_, index) => (
            <View key={`card-${index}`} style={styles.cardPlaceholder}>
              <SkeletonBlock height={18} width="58%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={14} width="42%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <SkeletonBlock height={14} width="34%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              <View style={styles.row2}>
                <SkeletonBlock height={30} width="32%" radius={8} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
                <SkeletonBlock height={30} width="32%" radius={8} shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
              </View>
            </View>
          ))}
        </>
      );
    }

    return (
      <>
        {Array.from({ length: listRows }).map((_, index) => (
          <View key={`list-item-${index}`} style={styles.listItem}>
            <SkeletonBlock height={18} width="56%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
            <SkeletonBlock height={13} width="36%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
            <SkeletonBlock height={12} width="24%" shimmerStyle={shimmerStyle} baseColor={baseColor} highlightColor={highlightColor} />
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={[styles.loadingWrap, { minHeight: reservedHeight }]} accessibilityLiveRegion="polite">
      {renderVariant()}
      <Text style={[styles.loadingLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function EmptyStateComponent({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Image
        source={brandImages.emptyBox}
        style={styles.illustration}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.label, { color: theme.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

function ErrorStateComponent({
  title,
  subtitle,
  onRetry,
}: {
  title: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Image
        source={brandImages.helperMan}
        style={styles.illustration}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.title, { color: theme.danger }]}>{title}</Text>
      {subtitle ? <Text style={[styles.label, { color: theme.muted }]}>{subtitle}</Text> : null}
      {onRetry ? <AppButton label="Retry" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

export const LoadingState = memo(LoadingStateComponent);
export const EmptyState = memo(EmptyStateComponent);
export const ErrorState = memo(ErrorStateComponent);

const styles = StyleSheet.create({
  center: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  illustration: {
    width: 96,
    height: 72,
    marginBottom: 4,
    opacity: 0.95,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  loadingWrap: {
    width: "100%",
    gap: 12,
    paddingVertical: 6,
  },
  loadingLabel: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
    fontWeight: "600",
  },
  skeletonBlock: {
    overflow: "hidden",
  },
  shimmerOverlay: {
    width: "42%",
    height: "100%",
    opacity: 0.78,
  },
  listItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    backgroundColor: "#FFFFFF",
    minHeight: 84,
    padding: 12,
    gap: 10,
  },
  cardPlaceholder: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    backgroundColor: "#FFFFFF",
    minHeight: 120,
    padding: 12,
    gap: 10,
  },
  productCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    backgroundColor: "#FFFFFF",
    minHeight: 340,
    padding: 12,
    gap: 10,
  },
  row2: {
    flexDirection: "row",
    gap: 8,
  },
  row3: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  tableRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    backgroundColor: "#FFFFFF",
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
});
