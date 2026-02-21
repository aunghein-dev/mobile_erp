import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { Text, TextInput } from "react-native";
import { AppProviders } from "@/app/providers/AppProviders";

const textDefaults = Text as unknown as {
  defaultProps?: {
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
  };
};
textDefaults.defaultProps = {
  ...(textDefaults.defaultProps ?? {}),
  allowFontScaling: false,
  maxFontSizeMultiplier: 1,
};

const textInputDefaults = TextInput as unknown as {
  defaultProps?: {
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
  };
};
textInputDefaults.defaultProps = {
  ...(textInputDefaults.defaultProps ?? {}),
  allowFontScaling: false,
  maxFontSizeMultiplier: 1,
};

export default function App() {
  return <AppProviders />;
}
