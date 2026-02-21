module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/src/test/mocks/fileMock.ts",
    "\\.(md)$": "<rootDir>/src/test/mocks/textMock.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo|@expo-google-fonts|react-native-svg)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/shared/assets/**",
    "!src/test/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
};
