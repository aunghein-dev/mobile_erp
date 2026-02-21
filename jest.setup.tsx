import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import "react-native-gesture-handler/jestSetup";

process.env.EXPO_PUBLIC_API_URL = "https://api.openwaremyanmar.site";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

jest.mock("react-native-reanimated", () => {
  const reanimated = require("react-native-reanimated/mock");
  reanimated.default.call = () => {};
  return reanimated;
});

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: any }) => {
    const ReactLocal = require("react");
    const { View } = require("react-native");
    return ReactLocal.createElement(View, null, children);
  },
}));

jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: jest.fn(),
}));

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

jest.mock("@shopify/flash-list", () => ({
  FlashList: ({ data, renderItem, ListEmptyComponent }: any) => {
    const ReactLocal = require("react");
    const { View } = require("react-native");

    if (!Array.isArray(data) || data.length === 0) {
      return ListEmptyComponent ?? null;
    }
    return ReactLocal.createElement(
      View,
      null,
      data.map((item: any, index: number) => {
        if (typeof renderItem !== "function") return null;
        const key = String(item?.groupId ?? item?.id ?? index);
        return ReactLocal.createElement(View, { key }, renderItem({ item, index }));
      })
    );
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const ReactLocal = require("react");
  const { View } = require("react-native");
  const mockInset = { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    SafeAreaProvider: ({ children }: { children?: any }) =>
      ReactLocal.createElement(ReactLocal.Fragment, null, children),
    SafeAreaView: ({ children }: { children?: any }) =>
      ReactLocal.createElement(View, null, children),
    SafeAreaConsumer: ({ children }: { children: (value: typeof mockInset) => any }) =>
      children(mockInset),
    useSafeAreaInsets: () => mockInset,
  };
});

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name?: string }) => {
    const ReactLocal = require("react");
    const { Text } = require("react-native");
    return ReactLocal.createElement(Text, null, name ?? "icon");
  },
}));

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (first.includes("not wrapped in act")) {
    return;
  }
  originalConsoleError(...(args as Parameters<typeof console.error>));
};

beforeEach(() => {
  mockAsyncStorage.clear();
  jest.clearAllMocks();
});
