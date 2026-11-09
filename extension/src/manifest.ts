// Builds manifest.json. extension/build.mjs runs this at build time, so the
// stores the extension may read always match src/lib/retailers.ts.

import { EXTENSION_STORES } from "@/lib/retailers";

export const EXTENSION_VERSION = "0.1.0";

function storeMatches(): string[] {
  const patterns = new Set<string>();
  for (const store of EXTENSION_STORES) {
    // "*." matches the bare domain too.
    for (const host of store.links!.hosts) patterns.add(`https://*.${host}/*`);
  }
  return [...patterns];
}

/** Both regibee.com and www.regibee.com in production; just the one origin in dev. */
function siteOrigins(siteUrl: string): string[] {
  const url = new URL(siteUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return [url.origin];
  const bare = url.hostname.replace(/^www\./, "");
  return [`${url.protocol}//${bare}`, `${url.protocol}//www.${bare}`];
}

export function buildManifest(siteUrl: string) {
  const stores = storeMatches();
  const sites = siteOrigins(siteUrl);
  const icons = { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" };

  return {
    manifest_version: 3,
    name: "Regibee",
    version: EXTENSION_VERSION,
    description: "Brings the items on your store registries into Regibee, with their registry links.",
    icons,
    action: { default_popup: "popup.html", default_title: "Regibee", default_icon: icons },
    background: { service_worker: "background.js", type: "module" },
    // activeTab and scripting let the popup read the product on the page
    // you're on, only when you click the toolbar button, the "Add to
    // Regibee" menu item or the shortcut. contextMenus adds that menu item.
    // None of them adds an install warning or lets it see other pages.
    permissions: ["storage", "activeTab", "scripting", "contextMenus"],
    // Opens the popup, like clicking the toolbar button. Owners can change
    // it at chrome://extensions/shortcuts.
    commands: {
      _execute_action: { suggested_key: { default: "Alt+Shift+R" } },
    },
    // Only the stores' sites and Regibee. Nothing else.
    host_permissions: [...stores, ...sites.map((origin) => `${origin}/*`)],
    content_scripts: [
      { matches: stores, js: ["store.js"], run_at: "document_idle" },
      // Every Regibee page, not just the Connect page: after signing in, the
      // site moves to the Connect page without a full page load, and Chrome
      // only adds content scripts on full loads. The background worker still
      // accepts a session only from the Connect page.
      { matches: sites.map((origin) => `${origin}/*`), js: ["connect.js"], run_at: "document_idle" },
    ],
    // The notice on store pages shows the Regibee logo.
    web_accessible_resources: [{ resources: ["logo.svg"], matches: stores }],
  };
}
