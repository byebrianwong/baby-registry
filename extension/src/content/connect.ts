// Runs on regibee.com. On the Connect page it passes the session the page
// created to the background worker, and tells the page how that went. It
// loads on every Regibee page so it's already there when the site moves to
// the Connect page without a full load, as it does after signing in.

import { CONNECT_PATH, EXTENSION_SOURCE, isPageMessage, type ExtensionMessage } from "@/lib/extension";
import { VERSION } from "../config";
import { ask } from "../messages";

type WithoutSource<T> = T extends unknown ? Omit<T, "source"> : never;

function tell(message: WithoutSource<ExtensionMessage>) {
  window.postMessage({ source: EXTENSION_SOURCE, ...message }, location.origin);
}

window.addEventListener("message", async (event) => {
  // Only the page itself, never another frame or site.
  if (event.source !== window || event.origin !== location.origin) return;
  if (!isPageMessage(event.data)) return;
  const message = event.data;

  if (message.type === "hello") {
    tell({ type: "ready", version: VERSION });
    return;
  }
  // Sessions and cancels come only from the Connect page.
  if (location.pathname !== CONNECT_PATH) return;
  if (message.type === "connect") {
    const result = await ask({ type: "connect-session", session: message.session });
    if (result.ok) tell({ type: "connected" });
    else tell({ type: "connect-failed", error: "The extension couldn't save the connection. Try again." });
  } else if (message.type === "cancel") {
    await ask({ type: "connect-cancel" });
  }
});

// The Connect page also says hello when it opens, which covers arriving there later.
if (location.pathname === CONNECT_PATH) tell({ type: "ready", version: VERSION });
