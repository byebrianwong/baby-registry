// Reads a product link on the phone, in a hidden web view, with the same
// reader the Chrome extension uses. The page loads over the owner's own
// connection, like it would in their browser, so stores that block
// Regibee's server (Amazon above all) still open.

import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { parseReadProduct, type ReadProduct } from "@/lib/product";
import { READER_SCRIPT } from "@/lib/reader-script";

// Gives up after this long and lets the owner fill in the rest.
const READ_TIMEOUT_MS = 15_000;

// Ask for the desktop page. The reader was checked on stores' desktop pages
// (see extension/README.md), and their phone pages are laid out differently.
const DESKTOP_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

export function ProductReader({ url, onResult }: { url: string; onResult: (product: ReadProduct | null) => void }) {
  const best = useRef<ReadProduct | null>(null);
  const done = useRef(false);
  const callback = useRef(onResult);
  useEffect(() => {
    callback.current = onResult;
  });

  useEffect(() => {
    done.current = false;
    best.current = null;
    const timer = setTimeout(() => finish(best.current), READ_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [url]);

  function finish(product: ReadProduct | null) {
    if (done.current) return;
    done.current = true;
    callback.current(product);
  }

  function onMessage(event: WebViewMessageEvent) {
    let data: unknown;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!data || typeof data !== "object" || (data as { type?: unknown }).type !== "regibee-product") return;
    const product = parseReadProduct((data as { product?: unknown }).product);
    if (product && (!best.current || (product.isProduct && !best.current.isProduct))) best.current = product;
    // A page that redirects runs the reader again, so wait for a product page.
    if (product?.isProduct) finish(product);
  }

  return (
    <View style={styles.hidden} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <WebView
        source={{ uri: url }}
        userAgent={DESKTOP_SAFARI}
        injectedJavaScript={READER_SCRIPT}
        onMessage={onMessage}
        onError={() => finish(best.current)}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) finish(best.current);
        }}
        // Store pages try to open their own apps. Stay on the web page.
        onShouldStartLoadWithRequest={(request) => /^https?:/i.test(request.url)}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback={false}
        cacheEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 360,
    height: 640,
    left: -10_000,
    top: 0,
    opacity: 0,
  },
});
