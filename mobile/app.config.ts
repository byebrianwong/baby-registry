import type { ExpoConfig } from "expo/config";

import { readBuildInfo } from "./scripts/build-info";
import productReader from "./src/generated/product-reader.json";

// The Expo project that runs EAS builds and over-the-air updates.
const EAS_PROJECT_ID = "dbf89b9a-6e9b-4d3f-8e7c-56605aeff72c";

// On iPhone, sharing from Safari runs this inside the page before the app
// opens, so the app gets the product's name, price and pictures straight from
// the page the owner is looking at. It's the same reader the Chrome extension
// uses (extension/src/product-reader.ts). The share extension's preprocessor
// passes everything in `metas` to the app as shareIntent.meta.
const readProductInSafari = `
    try {
      ${productReader.source}
      metas["regibee:product"] = JSON.stringify(__regibeeProductReader.readProductPage());
    } catch (error) {}
`;

const config: ExpoConfig = {
  name: "Regibee",
  slug: "regibee",
  // The Expo account the project belongs to.
  owner: "deniseangos-team",
  version: "1.0.0",
  // An update reaches only builds with the same native code. See fingerprint.config.js.
  runtimeVersion: { policy: "fingerprint" },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "regibee",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.regibee.app",
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: "com.regibee.app",
    adaptiveIcon: {
      backgroundColor: "#FAC515",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: true,
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FDFAF6",
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
        dark: { backgroundColor: "#110B0A", image: "./assets/images/splash-icon.png" },
      },
    ],
    "expo-sqlite",
    "@react-native-community/datetimepicker",
    // Before expo-share-intent, so it runs after it. See the plugin file.
    ["./plugins/with-share-extension-label", { target: "RegibeeShare", label: "Regibee" }],
    [
      "expo-share-intent",
      {
        // The extension's Xcode target. The share sheet shows "Regibee" (plugin above).
        iosShareExtensionName: "RegibeeShare",
        // Links from any app, and pages from Safari (which runs the reader above).
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
        androidIntentFilters: ["text/*"],
        preprocessorInjectJS: readProductInSafari,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
    // The commit and latest pull request, shown in preview builds. See scripts/build-info.js.
    build: readBuildInfo(),
  },
};

export default config;
