// What decides whether an over-the-air update fits an installed build. The
// runtime version is a fingerprint of the native code (runtimeVersion in
// app.config.ts). The commit and latest pull request that
// scripts/build-info.js puts in the config's `extra` change with every commit
// but not the native code, so `extra` and that script are left out. Otherwise
// no update would ever match a build from an earlier commit. Expo's default
// skips stay.

const { DEFAULT_SOURCE_SKIPS, SourceSkips } = require("expo/fingerprint");

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.ExpoConfigExtraSection,
  ignorePaths: ["scripts/build-info.js"],
};
