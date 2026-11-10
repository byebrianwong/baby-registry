// Tests for the browser extension. Run them with npm run test:extension,
// which builds extension/dist first. See "Tests" in extension/README.md.

import { defineConfig } from "@playwright/test";
import path from "node:path";
import { PAGES_DIR } from "./pages";

export default defineConfig({
  testDir: ".",
  // Each test starts its own Chromium with the extension.
  fullyParallel: true,
  timeout: 60_000,
  reporter: [["list"]],
  // The recorded results and the files from failed tests hold the
  // registries' items, so they live with the saved pages, outside the repo.
  snapshotPathTemplate: path.join(PAGES_DIR, "expected", "{arg}{ext}"),
  outputDir: path.join(PAGES_DIR, "test-results"),
});
