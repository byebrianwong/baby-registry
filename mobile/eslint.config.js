// Expo's lint rules for the app. The website has its own config at the repo root.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", "src/generated/*"] },
  // An HTML rule. React Native's <Text> shows apostrophes as they are.
  { rules: { "react/no-unescaped-entities": "off" } },
]);
