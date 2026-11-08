// Set at build time by extension/build.mjs.
declare const __REGIBEE_URL__: string;
declare const __EXTENSION_VERSION__: string;

/** The Regibee site the extension talks to: https://www.regibee.com, or localhost in dev builds. */
export const REGIBEE_URL: string = __REGIBEE_URL__;
export const VERSION: string = __EXTENSION_VERSION__;
