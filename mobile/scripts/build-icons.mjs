// Makes the app's icons and splash picture from the website's panda logo
// (src/app/icon.svg). Run it after the logo changes:
//
//   npm run icons

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const out = (name) => path.resolve(here, "../assets/images", name);

// sharp comes with the website's dependencies, at the repo root.
const require = createRequire(path.join(repoRoot, "package.json"));
const sharp = require("sharp");

// The logo's colors are CSS variables with fallbacks. Keep the fallbacks.
const svg = readFileSync(path.join(repoRoot, "src/app/icon.svg"), "utf8").replace(/var\(--[\w-]+,\s*(#[0-9a-fA-F]{3,8})\)/g, "$1");
// White and pink parts turn into the background in the one-color Android icon.
const monochromeSvg = svg.replace(/fill="#(?!381917)[0-9a-fA-F]{6}"/g, 'fill="none"');

const YELLOW = "#FAC515";
const CREAM = "#FDFAF6";

async function panda(height, source = svg) {
  return sharp(Buffer.from(source), { density: 600 }).resize({ height, fit: "contain", background: "#0000" }).png().toBuffer();
}

async function onSquare(size, logoHeight, background, source) {
  const logo = await panda(logoHeight, source);
  const meta = await sharp(logo).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png();
}

// iOS and the web: the panda on bee yellow, filling most of the square.
await (await onSquare(1024, 700, YELLOW)).toFile(out("icon.png"));
// Android adaptive icon: the system crops to a circle or squircle, so keep the
// panda inside the middle two thirds.
await (await onSquare(1024, 560, "#0000")).toFile(out("android-icon-foreground.png"));
await (await onSquare(1024, 560, "#0000", monochromeSvg)).toFile(out("android-icon-monochrome.png"));
// Splash screen and the sign-in screen.
await (await onSquare(1024, 900, "#0000")).toFile(out("splash-icon.png"));
await sharp(await panda(400)).toFile(out("panda.png"));
await (await onSquare(96, 76, CREAM)).toFile(out("favicon.png"));

console.log("Wrote the icons to assets/images.");
