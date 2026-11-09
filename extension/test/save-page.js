// Saves the store page you're on as a test page for the extension tests.
//
// Open the page in Chrome, signed in if it needs that. Open DevTools, paste
// this whole file into the Console and press Enter. On a registry page it
// first scrolls through the page so every item and picture loads. Then it
// downloads <store>-<registry|product>.html. Move that file to the test pages
// folder (see "Tests" in extension/README.md).
//
// The copy is the page as it stands after the store's scripts have run: the
// same elements and the CSS rules that apply to them, without the scripts.
// The tests don't load pictures, so it also notes each picture's size.
//
// The copy keeps everything on the page, names and addresses included.
// Never commit these files.

await (async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const store = location.hostname.replace(/^www\./, "").split(".")[0];
  const kind = /registry|baby-reg/i.test(location.pathname) ? "registry" : "product";

  // On a registry page, scroll to the bottom and back until the page stops
  // growing, so items and pictures that load as you scroll are there. A
  // product page is saved as it first opens, the way the owner sees it when
  // they click the toolbar button.
  let height = 0;
  for (let round = 0; kind === "registry" && round < 5 && document.documentElement.scrollHeight !== height; round++) {
    height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += Math.round(innerHeight * 0.8)) {
      scrollTo(0, y);
      await sleep(250);
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await sleep(1500);
  }
  scrollTo(0, 0);
  // Load every picture now, even lazy ones out of view (or in a tab that's
  // in the background), so each one has its real size. The copy keeps
  // loading="lazy".
  const lazy = new Set([...document.images].filter((img) => img.loading === "lazy"));
  for (const img of lazy) img.loading = "eager";
  await Promise.all(
    [...document.images]
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
            setTimeout(resolve, 5000);
          })
      )
  );
  await sleep(1000);

  // Keep the CSS rules that match something on the page. Hover, focus and
  // other states don't count against a rule, and a selector the browser
  // can't check keeps its rule.
  const STRUCTURAL =
    /^:(not|is|where|has|nth-child|nth-last-child|nth-of-type|nth-last-of-type|first-child|last-child|only-child|first-of-type|last-of-type|only-of-type|empty|root|checked|disabled|enabled|lang|dir|scope|defined|required|optional)\b/i;
  const PSEUDO = /::?-?[a-z][a-z0-9-]*(\((?:[^()]|\([^()]*\))*\))?/gi;
  const matched = new Map();
  const matches = (selector) => {
    if (matched.has(selector)) return matched.get(selector);
    let result = false;
    try {
      result = document.querySelector(selector) !== null;
    } catch {
      // Pseudo-elements and some states can't be queried. Try without them.
    }
    if (!result) {
      try {
        result = document.querySelector(selector.replace(PSEUDO, (m) => (STRUCTURAL.test(m) ? m : ""))) !== null;
      } catch {
        result = true;
      }
    }
    matched.set(selector, result);
    return result;
  };
  const keepRule = (rule) => {
    if (rule instanceof CSSStyleRule) return matches(rule.selectorText) ? rule.cssText : "";
    // Fonts don't load in the tests.
    if (rule instanceof CSSFontFaceRule || rule instanceof CSSImportRule) return "";
    // @media, @supports, @container and @layer blocks: keep the rules inside that match.
    if (!(rule instanceof CSSKeyframesRule) && rule.cssRules) {
      const inner = [...rule.cssRules].map(keepRule).filter(Boolean).join("\n");
      return inner ? `${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{\n${inner}\n}` : "";
    }
    return rule.cssText;
  };

  const css = [];
  const missingCss = [];
  for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) {
    if (sheet.disabled) continue;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // Another site's stylesheet: fetch it to read it.
      try {
        const copy = new CSSStyleSheet();
        copy.replaceSync(await (await fetch(sheet.href)).text());
        rules = copy.cssRules;
      } catch {
        missingCss.push(sheet.href);
        continue;
      }
    }
    let text = [...rules].map(keepRule).filter(Boolean).join("\n");
    const media = sheet.media?.mediaText;
    if (text && media && media !== "all") text = `@media ${media} {\n${text}\n}`;
    if (text) css.push(text);
  }

  const copy = document.documentElement.cloneNode(true);

  // Pictures don't load in the tests. Give each one without a size of its
  // own the size it loaded at, so it takes the same space on the page. One
  // that hadn't loaded gets 0 × 0, as it had then. Some stores (Walmart)
  // write width="" height="", which count as no size.
  const sized = (img, name) => /^\s*\d/.test(img.getAttribute(name) ?? "");
  const images = [...document.images];
  const copies = [...copy.querySelectorAll("img")];
  if (images.length === copies.length) {
    images.forEach((img, i) => {
      if (lazy.has(img)) {
        img.loading = "lazy";
        copies[i].loading = "lazy";
      }
      if (sized(copies[i], "width") || sized(copies[i], "height")) return;
      copies[i].setAttribute("width", String(img.naturalWidth));
      copies[i].setAttribute("height", String(img.naturalHeight));
    });
  }

  // Take out everything that would run or load: scripts (but not the
  // structured product data), frames, stylesheets (their rules are inlined
  // below) and event handlers.
  copy
    .querySelectorAll('script:not([type="application/ld+json"]), noscript, iframe, frame, object, embed, link, style, meta[http-equiv]')
    .forEach((el) => el.remove());
  for (const el of copy.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }
  const style = document.createElement("style");
  style.textContent = css.join("\n");
  copy.querySelector("head").append(style);

  const file = `${store}-${kind}.html`;
  // en-CA dates read 2026-11-08.
  const about = { url: location.href, saved: new Date().toLocaleDateString("en-CA") };
  const html = `<!DOCTYPE html>\n<!-- regibee-test-page ${JSON.stringify(about)} -->\n${copy.outerHTML}\n`;

  // The link stays off the page: some stores (Target) cancel every link
  // click on their pages. If Chrome asks whether the site may download
  // multiple files, allow it, or save the next page from a new tab.
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  link.download = file;
  link.click();

  const summary = {
    file,
    sizeKb: Math.round(html.length / 1024),
    cssKb: Math.round(style.textContent.length / 1024),
    pictures: images.length,
    picturesWithoutSize: images.filter((img) => !img.naturalWidth).length,
    missingCss,
  };
  console.log("Saved", summary);
  return summary;
})();
