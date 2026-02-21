import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";

const UNIFIED_DRAWER_HEIGHT = "84%" as const;

type DrawerSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
  animationType?: "none" | "slide" | "fade";
  dismissOnBackdropPress?: boolean;
};

export function DrawerSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  overlayStyle,
  animationType = "slide",
  dismissOnBackdropPress = true,
}: DrawerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, overlayStyle]}>
        {dismissOnBackdropPress ? (
          <AppPressable
            style={StyleSheet.absoluteFillObject}
            touchEffect="none"
            accessibilityRole="button"
            accessibilityLabel="Close panel"
            accessibilityHint="Dismiss and return to previous content"
            onPress={onClose}
          />
        ) : null}
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
        >
          <View style={[styles.sheet, sheetStyle]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
            <View style={styles.handle} accessible={false} />
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 26, 42, 0.35)",
    justifyContent: "flex-end",
  },
  keyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    height: UNIFIED_DRAWER_HEIGHT,
    maxHeight: UNIFIED_DRAWER_HEIGHT,
    minHeight: UNIFIED_DRAWER_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 12,
    backgroundColor: "#C7D2E0",
    alignSelf: "center",
    marginBottom: 9,
  },
});
