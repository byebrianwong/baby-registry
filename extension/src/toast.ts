// The notice automatic mode shows over a store's page after adding items.
// It lives in a shadow root, so the store's styles can't change it.

const LOGO_URL = () => chrome.runtime.getURL("logo.svg");
const AUTO_HIDE_MS = 15_000;

const STYLES = `
  :host { all: initial; }
  .toast {
    position: fixed; top: 16px; right: 16px; z-index: 2147483647;
    width: 360px; max-width: calc(100vw - 32px); box-sizing: border-box;
    background: #ffffff; color: #231b18; border-radius: 12px; padding: 14px;
    box-shadow: 0 8px 24px rgba(35, 27, 24, 0.16), 0 1px 2px rgba(35, 27, 24, 0.08);
    font: 400 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    display: flex; flex-direction: column; gap: 12px;
  }
  .row { display: flex; gap: 10px; align-items: flex-start; }
  .logo { flex: none; height: 28px; width: auto; }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .title { font-weight: 600; }
  .body { font-size: 12px; line-height: 1.45; color: #5e5652; }
  .close {
    flex: none; width: 32px; height: 32px; margin: -6px -6px 0 0; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    color: #5e5652; background: transparent; border: none; border-radius: 9999px; cursor: pointer;
  }
  .close:hover { background: #f8f4ef; }
  .actions { display: flex; gap: 8px; padding-left: 38px; }
  .primary, .secondary {
    font: inherit; font-size: 13px; font-weight: 600; border-radius: 9999px;
    padding: 8px 14px; min-height: 36px; box-sizing: border-box; cursor: pointer;
    display: inline-flex; align-items: center; text-decoration: none;
  }
  .primary { color: #ffffff; background: #004659; border: none; }
  .primary:hover { background: #003847; }
  .secondary { color: #4d4440; background: #ffffff; border: 1px solid #dcd5cf; }
  .secondary:disabled { opacity: 0.6; cursor: default; }
  :focus-visible { outline: 2px solid #004659; outline-offset: 2px; }
`;

export interface ImportToastOptions {
  count: number;
  storeName: string;
  registryTitle: string;
  reviewUrl: string;
  /** Resolves to how many items were removed, or throws. */
  onUndo: () => Promise<number>;
}

let current: HTMLElement | null = null;

export function showImportToast(options: ImportToastOptions) {
  current?.remove();
  const host = document.createElement("regibee-notice");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLES;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");

  const row = document.createElement("div");
  row.className = "row";
  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = LOGO_URL();
  logo.alt = "";
  const text = document.createElement("div");
  text.className = "text";
  const title = document.createElement("span");
  title.className = "title";
  const noun = options.count === 1 ? "item" : "items";
  title.textContent = `${options.count} new ${noun} added to Regibee`;
  const body = document.createElement("span");
  body.className = "body";
  body.textContent =
    options.count === 1
      ? `From your ${options.storeName} registry, with its registry link. It's in ${options.registryTitle}.`
      : `From your ${options.storeName} registry, with their registry links. They're in ${options.registryTitle}.`;
  text.append(title, body);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "close";
  close.setAttribute("aria-label", "Close");
  close.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  row.append(logo, text, close);

  const actions = document.createElement("div");
  actions.className = "actions";
  const review = document.createElement("a");
  review.className = "primary";
  review.href = options.reviewUrl;
  review.target = "_blank";
  review.rel = "noopener";
  review.textContent = "Review on Regibee";
  const undo = document.createElement("button");
  undo.type = "button";
  undo.className = "secondary";
  undo.textContent = "Undo";
  actions.append(review, undo);

  toast.append(row, actions);
  shadow.append(style, toast);
  document.documentElement.append(host);
  current = host;

  let timer = setTimeout(() => host.remove(), AUTO_HIDE_MS);
  // Don't hide it while someone is using it.
  toast.addEventListener("mouseenter", () => clearTimeout(timer));
  toast.addEventListener("focusin", () => clearTimeout(timer));
  toast.addEventListener("mouseleave", () => {
    clearTimeout(timer);
    timer = setTimeout(() => host.remove(), AUTO_HIDE_MS);
  });

  close.addEventListener("click", () => host.remove());
  undo.addEventListener("click", async () => {
    undo.disabled = true;
    undo.textContent = "Undoing…";
    try {
      const removed = await options.onUndo();
      title.textContent = removed === 1 ? "Removed 1 item from Regibee" : `Removed ${removed} items from Regibee`;
      body.textContent = removed === 1 ? "It won't be added again automatically." : "They won't be added again automatically.";
      actions.remove();
    } catch {
      undo.disabled = false;
      undo.textContent = "Undo";
      body.textContent = "We couldn't undo that. Remove the items on Regibee instead.";
    }
  });
}
