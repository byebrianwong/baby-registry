// The script the hidden web view runs in a product page (see
// src/components/product-reader.tsx). It's the Chrome extension's reader,
// built into src/generated/product-reader.json.

import productReader from "@/generated/product-reader.json";

// Runs in the page after it loads. Many stores fill in the price and pictures
// with JavaScript after the page loads, so it reads a few times and sends the
// most complete result.
export const READER_SCRIPT = `
(function () {
  if (window.__regibeeReading) return;
  window.__regibeeReading = true;
  try { ${productReader.source} } catch (error) {}
  var attempts = 0;
  var best = null;
  function score(p) {
    if (!p) return -1;
    return (p.isProduct ? 4 : 0) + (p.title ? 1 : 0) + (p.price ? 2 : 0) + (p.images && p.images.length ? 1 : 0);
  }
  function send(product) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "regibee-product", product: product }));
  }
  function tick() {
    attempts += 1;
    var product = null;
    try { product = __regibeeProductReader.readProductPage(); } catch (error) {}
    if (score(product) > score(best)) best = product;
    var complete = best && best.isProduct && best.title && best.price && best.images && best.images.length;
    if (complete || attempts >= 8) { send(best); return; }
    setTimeout(tick, 750);
  }
  setTimeout(tick, 300);
})();
true;
`;
