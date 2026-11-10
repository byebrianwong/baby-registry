// The app shares the website's store rules (src/lib/retailers.ts) instead of
// keeping its own copy, so Metro has to watch that folder too.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../src/lib")];

module.exports = config;
