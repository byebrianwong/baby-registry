// Builds the extension's product reader (extension/src/product-reader.ts)
// into a script the app can run inside a web page, and writes it to
// src/generated/product-reader.json.
//
// The app runs it in two places:
// - In a hidden web view, on a link the owner pasted or shared from an app.
// - On iPhone, inside Safari, on the page the owner shared from (the share
//   extension's preprocessing script, see app.config.ts).
//
// Hermes doesn't keep function source, so the reader can't be turned into a
// string at run time the way the Chrome extension does it. Run this after
// changing product-reader.ts:
//
//   npm run product-reader
//
// `npm run check` fails when the generated file is out of date.

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const output = path.resolve(here, "../src/generated/product-reader.json");

// esbuild is a dev dependency of the website, at the repo root.
const require = createRequire(path.join(repoRoot, "package.json"));
const esbuild = require("esbuild");

const result = await esbuild.build({
  entryPoints: [path.join(repoRoot, "extension/src/product-reader.ts")],
  bundle: true,
  write: false,
  format: "iife",
  // Defines `var __regibeeProductReader = { readProductPage }` in the page.
  globalName: "__regibeeProductReader",
  target: "es2019",
  minify: true,
  legalComments: "none",
});

const source = result.outputFiles[0].text.trim();
const json = JSON.stringify({ source }, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(output, "utf8");
  } catch {}
  if (current !== json) {
    console.error("src/generated/product-reader.json is out of date. Run `npm run product-reader`.");
    process.exit(1);
  }
  console.log("Product reader is up to date.");
} else {
  writeFileSync(output, json);
  console.log(`Wrote ${path.relative(process.cwd(), output)} (${source.length} characters).`);
}
