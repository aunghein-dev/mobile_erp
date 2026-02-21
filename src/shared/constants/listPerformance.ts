import { Platform } from "react-native";

export const DEFAULT_LIST_PERFORMANCE_PROPS = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 16,
  windowSize: 7,
  removeClippedSubviews: Platform.OS === "android",
} as const;

