// expo-share-intent names the iPhone share extension's Xcode target after its
// label, so the label can't be "Regibee": that's the app's own target. This
// gives the extension its own target name ("RegibeeShare", set in
// app.config.ts) and then sets the label people see in the share sheet back
// to "Regibee".
//
// expo-share-intent writes the extension's Info.plist from its Xcode project
// mod. Expo runs mods of one kind newest-plugin first, so this plugin is listed
// BEFORE expo-share-intent in app.config.ts, which makes its mod run after.

const fs = require("node:fs");
const path = require("node:path");
const { withXcodeProject } = require("expo/config-plugins");
const plist = require("@expo/plist").default;

module.exports = function withShareExtensionLabel(config, { target, label }) {
  return withXcodeProject(config, (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, target, "ShareExtension-Info.plist");
    if (!fs.existsSync(file)) {
      throw new Error(`with-share-extension-label: ${file} doesn't exist. Is this plugin listed before expo-share-intent?`);
    }
    const info = plist.parse(fs.readFileSync(file, "utf8"));
    info.CFBundleDisplayName = label;
    fs.writeFileSync(file, plist.build(info));
    return cfg;
  });
};
