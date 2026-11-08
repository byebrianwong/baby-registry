// The toolbar popup. On a store registry page it lists the items that aren't
// on Regibee yet; on a product page it offers to add that item; anywhere else
// it shows the stores and settings.

import {
  USED_CONDITIONS,
  type AddProductResponse,
  type AddResponse,
  type ExtensionRegistry,
  type ProductItem,
  type StoreItem,
} from "@/lib/extension";
import { classifyStoreLink, EXTENSION_STORES, getStore, storeItemKey, type StoreId, type StoreInfo } from "@/lib/retailers";
import { REGIBEE_URL } from "../config";
import { readProductPage, type ProductPage } from "../product-reader";
import {
  ask,
  type CheckResult,
  type ContentRequest,
  type Mode,
  type PopupState,
  type ReadResult,
  type RegistriesResult,
  type Result,
} from "../messages";

// ── Tiny DOM helpers ─────────────────────────────────────────────────────

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === "function") el.addEventListener(name.replace(/^on/, "").toLowerCase(), value);
    else if (name === "className") el.className = String(value);
    else if (value === true) el.setAttribute(name, "");
    else el.setAttribute(name, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}

function icon(paths: string, size = 16): SVGElement {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  return wrapper.firstElementChild as SVGElement;
}

const CHECK = '<path d="M20 6 9 17l-5-5"/>';
const CHEVRON = '<path d="m6 9 6 6 6-6"/>';
const EXTERNAL = '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>';
const CIRCLE_CHECK = '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>';

const app = document.getElementById("app")!;

function render(...children: Child[]) {
  app.replaceChildren(...children.filter((c): c is Node | string => Boolean(c)));
}

// ── Formatting ───────────────────────────────────────────────────────────

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function ago(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  return `${Math.round(days / 7)} weeks ago`;
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function initialOf(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function openTab(url: string) {
  void chrome.tabs.create({ url });
  window.close();
}

// ── Shared pieces ────────────────────────────────────────────────────────

function header(user: { name: string } | null) {
  return h(
    "header",
    { className: "header" },
    h(
      "span",
      { className: "brand" },
      h("img", { src: "logo.svg", alt: "" }),
      h("span", { className: "wordmark" }, "Regibee")
    ),
    user && h("span", { className: "avatar", role: "img", "aria-label": `Signed in as ${user.name}` }, initialOf(user.name))
  );
}

function storeRow(store: StoreInfo, detail: string) {
  return h(
    "div",
    { className: "store-row" },
    h("span", { className: "initial", "aria-hidden": "true" }, initialOf(store.name)),
    h(
      "div",
      { className: "stack" },
      h("h1", { className: "name" }, `Your ${store.name} registry`),
      h("span", { className: "muted" }, detail)
    )
  );
}

function registrySelect(registries: ExtensionRegistry[], selected: string, label: string, onChange: (id: string) => void) {
  const select = h(
    "select",
    { id: "registry", onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value) },
    ...registries.map((r) => h("option", { value: r.id, selected: r.id === selected }, r.title))
  );
  return h("div", { className: "field" }, h("label", { for: "registry" }, label), select);
}

function showError(user: { name: string } | null, message: string, retry: () => void) {
  render(
    header(user),
    h(
      "main",
      { className: "body" },
      h("p", { className: "error", role: "alert" }, message),
      h("div", { className: "footer-actions" }, h("button", { type: "button", className: "button secondary", onclick: retry }, "Try again"))
    )
  );
}

// ── Views ────────────────────────────────────────────────────────────────

function showConnect(signedOut = false) {
  render(
    header(null),
    h(
      "main",
      { className: "body" },
      h("h1", { className: "title" }, "Connect Regibee"),
      h(
        "p",
        { className: "lead" },
        "Sign in once on regibee.com. Then the extension can bring the items on your store registries into Regibee, with their registry links."
      ),
      signedOut && h("p", { className: "note" }, "The extension was signed out. Connect it again to keep going."),
      h(
        "div",
        { className: "footer-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            onclick: async () => {
              await ask({ type: "open-connect" });
              window.close();
            },
          },
          "Connect"
        )
      )
    )
  );
}

function showNoRegistries(user: { name: string }) {
  render(
    header(user),
    h(
      "main",
      { className: "body" },
      h("p", { className: "lead" }, "You don't manage any registries on Regibee yet. Make one, then come back to add your store items."),
      h(
        "div",
        { className: "footer-actions" },
        h("button", { type: "button", className: "button primary", onclick: () => openTab(`${REGIBEE_URL}/dashboard/registry/new`) }, "Make a registry")
      )
    )
  );
}

function showCouldntRead(user: { name: string }, store: StoreInfo, retry: () => void) {
  render(
    header(user),
    h(
      "main",
      { className: "body" },
      storeRow(store, "No items found on this page"),
      h("p", { className: "lead" }, "We couldn't find any registry items on this page."),
      h(
        "p",
        { className: "muted" },
        store.openRegistryStep ??
          "Make sure the page lists your registry's items. If the store changed its page, you can still paste each item's registry link on Regibee."
      ),
      h("div", { className: "footer-actions" }, h("button", { type: "button", className: "button secondary", onclick: retry }, "Try again"))
    )
  );
}

interface ImportContext {
  user: { name: string };
  store: StoreInfo;
  items: StoreItem[];
  registries: ExtensionRegistry[];
  registryId: string;
  mode: Mode;
  reload: () => void;
}

async function showImport(ctx: ImportContext) {
  const { user, store, items, registries } = ctx;
  let registryId = ctx.registryId;
  const registryTitle = () => registries.find((r) => r.id === registryId)?.title ?? "your registry";

  render(header(user), h("main", { className: "body" }, storeRow(store, `${plural(items.length, "item")} found`), h("p", { className: "muted" }, "Checking Regibee…")));

  const checked = await ask<CheckResult>({ type: "check", registryId, store: store.id, items });
  if (!checked.ok) return handleFailure(checked, user, ctx.reload);
  const existing = new Set(checked.data.existing);
  const fresh = items.filter((i) => !existing.has(storeItemKey(i.url)!));
  const already = items.filter((i) => existing.has(storeItemKey(i.url)!));
  const listed = items.map((i) => storeItemKey(i.url)!).filter(Boolean);
  const picked = new Set(fresh.map((i) => storeItemKey(i.url)!));
  let auto = ctx.mode === "auto";

  const onRegistryChange = async (id: string) => {
    registryId = id;
    await ask({ type: "set-registry", registryId: id });
    await showImport({ ...ctx, registryId: id, mode: auto ? "auto" : "ask" });
  };

  const summary = `${plural(items.length, "item")} found · ${
    fresh.length === 0 ? "all on Regibee" : `${fresh.length} not on Regibee yet`
  }`;

  const button = h("button", { type: "button", className: "button primary" }) as HTMLButtonElement;
  const updateButton = () => {
    button.disabled = picked.size === 0;
    button.textContent = picked.size === 0 ? "Pick items to add" : `Add ${plural(picked.size, "item")} to Regibee`;
  };
  updateButton();

  const itemRows = fresh.map((item) => {
    const key = storeItemKey(item.url)!;
    const box = h("input", {
      type: "checkbox",
      checked: true,
      onchange: (e: Event) => {
        if ((e.target as HTMLInputElement).checked) picked.add(key);
        else picked.delete(key);
        updateButton();
      },
    });
    return h(
      "li",
      {},
      h(
        "label",
        { className: "item" },
        box,
        item.imageUrl
          ? h("img", { className: "thumb", src: item.imageUrl, alt: "", loading: "lazy", referrerpolicy: "no-referrer" })
          : h("span", { className: "thumb", "aria-hidden": "true" }),
        h(
          "span",
          { className: "stack" },
          h("span", { className: "item-title", title: item.title }, item.title),
          h(
            "span",
            { className: "meta" },
            item.price !== null && h("span", { className: "price" }, money.format(item.price)),
            h("span", { className: "ok" }, icon(CHECK, 12), "Registry link")
          )
        )
      )
    );
  });

  let alreadyRow: HTMLElement | null = null;
  if (already.length > 0) {
    const list = h("ul", { className: "existing", id: "already", hidden: true }, ...already.map((i) => h("li", { title: i.title }, i.title)));
    const toggle = h(
      "button",
      {
        type: "button",
        className: "toggle",
        "aria-expanded": "false",
        "aria-controls": "already",
        onclick: () => {
          const open = toggle.getAttribute("aria-expanded") === "true";
          toggle.setAttribute("aria-expanded", String(!open));
          list.hidden = open;
        },
      },
      `${already.length} already on Regibee`,
      icon(CHEVRON)
    );
    alreadyRow = h("div", { className: "already" }, toggle, list);
  }

  const autoBox = h("input", {
    type: "checkbox",
    checked: auto,
    onchange: (e: Event) => {
      auto = (e.target as HTMLInputElement).checked;
    },
  });

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Adding…";
    const chosen = fresh.filter((i) => picked.has(storeItemKey(i.url)!));
    await ask({ type: "set-mode", mode: auto ? "auto" : "ask" });
    const added = await ask<AddResponse>({ type: "add", registryId, items: chosen, listed });
    if (!added.ok) return handleFailure(added, user, ctx.reload);
    showAdded(user, store, registryId, registryTitle(), added.data);
  });

  // Nothing new: say so, and still offer automatic mode for next time.
  if (fresh.length === 0) {
    render(
      header(user),
      h(
        "main",
        { className: "body" },
        storeRow(store, summary),
        registries.length > 1 && registrySelect(registries, registryId, "Add to", onRegistryChange),
        h("p", { className: "lead" }, `Everything on your ${store.name} registry is already on ${registryTitle()}.`),
        h(
          "div",
          { className: "footer-actions" },
          h(
            "button",
            { type: "button", className: "button secondary", onclick: () => openTab(`${REGIBEE_URL}/dashboard/registry/${registryId}`) },
            "Review on Regibee"
          )
        )
      )
    );
    return;
  }

  render(
    header(user),
    h(
      "main",
      { className: "body" },
      storeRow(store, summary),
      !store.registryPage?.verified &&
        h("p", { className: "note" }, `Reading ${store.name} registries is new. Check the items look right before you add them.`),
      registrySelect(registries, registryId, "Add to", onRegistryChange),
      h("div", { className: "picker" }, h("ul", { className: "items" }, ...itemRows), alreadyRow),
      h("label", { className: "check" }, autoBox, "Add new items automatically next time"),
      h(
        "div",
        { className: "footer-actions" },
        button,
        h("p", { className: "footnote" }, `We save each item's registry link, so gifts still count toward your ${store.name} registry.`)
      )
    )
  );
}

function showAdded(user: { name: string }, store: StoreInfo, registryId: string, registryTitle: string, result: AddResponse) {
  const count = result.added.length;
  render(
    header(user),
    h(
      "main",
      { className: "body" },
      h(
        "div",
        { className: "done", role: "status" },
        icon(CIRCLE_CHECK, 36),
        h("h1", {}, count === 0 ? "Nothing new to add" : `Added ${plural(count, "item")} to Regibee`),
        h(
          "p",
          { className: "lead" },
          count === 0
            ? `Those items are already on ${registryTitle}.`
            : count === 1
              ? `It's on ${registryTitle}, with its ${store.name} registry link.`
              : `They're on ${registryTitle}, with their ${store.name} registry links.`
        ),
        result.skipped > 0 && count > 0 && h("p", { className: "muted" }, `${plural(result.skipped, "item was", "items were")} already there.`)
      ),
      h(
        "div",
        { className: "footer-actions" },
        h(
          "button",
          { type: "button", className: "button primary", onclick: () => openTab(`${REGIBEE_URL}/dashboard/registry/${registryId}`) },
          "Review on Regibee"
        )
      )
    )
  );
}

function showHome(state: PopupState, user: { name: string }, data: RegistriesResult, page: ProductPage | null = null) {
  const registryId = data.registryId!;
  const storeItems = EXTENSION_STORES.map((store) => {
    const last = state.lastChecked[store.id as StoreId];
    const status = last ? `Checked ${ago(last.at)} · ${plural(last.count, "item")}` : "Not checked yet";
    return h(
      "li",
      {},
      h("span", { className: "initial", "aria-hidden": "true" }, initialOf(store.name)),
      h("span", { className: "stack" }, h("span", { className: "name", style: "font-weight: 600" }, store.name), h("span", { className: "muted" }, status)),
      h(
        "a",
        {
          className: "open",
          href: store.registryPage!.openUrl,
          "aria-label": `Open your ${store.name} registry`,
          onclick: (e: Event) => {
            e.preventDefault();
            openTab(store.registryPage!.openUrl);
          },
        },
        "Open",
        icon(EXTERNAL, 14)
      )
    );
  });

  const modeRadio = (mode: Mode, label: string) =>
    h(
      "label",
      { className: "check" },
      h("input", {
        type: "radio",
        name: "mode",
        value: mode,
        checked: state.mode === mode,
        onchange: () => void ask({ type: "set-mode", mode }),
      }),
      label
    );

  render(
    header(user),
    h(
      "main",
      { className: "body" },
      h("h1", { className: "sr-only" }, "Your store registries"),
      // Nothing on the page says it's a product, but the owner may still want it.
      page &&
        h(
          "button",
          {
            type: "button",
            className: "button secondary",
            onclick: () =>
              showProduct({
                user,
                product: page,
                registries: data.registries,
                registryId,
                storesWithRegistries: storesWithRegistries(state, data.registries.find((r) => r.id === registryId)),
              }),
          },
          "Add this page to Regibee"
        ),
      h("p", { className: "lead" }, "Open one of your store registries and we'll find items to add to Regibee. On a product page, click the Regibee button to add that item."),
      h("ul", { className: "stores" }, ...storeItems),
      data.registries.length > 1 &&
        registrySelect(data.registries, registryId, "New items go to", (id) => void ask({ type: "set-registry", registryId: id })),
      h("fieldset", {}, h("legend", {}, "When new items show up"), modeRadio("ask", "Ask me first"), modeRadio("auto", "Add them automatically")),
      h(
        "div",
        { className: "bottom-bar" },
        h(
          "a",
          {
            href: `${REGIBEE_URL}/dashboard/registry/${registryId}/settings#store-registries`,
            onclick: (e: Event) => {
              e.preventDefault();
              openTab(`${REGIBEE_URL}/dashboard/registry/${registryId}/settings#store-registries`);
            },
          },
          "Manage store registries"
        ),
        h(
          "button",
          {
            type: "button",
            className: "link-button",
            onclick: async () => {
              await ask({ type: "disconnect" });
              showConnect();
            },
          },
          "Disconnect"
        )
      )
    )
  );
}

interface ProductContext {
  user: { name: string };
  product: ProductPage;
  registries: ExtensionRegistry[];
  registryId: string;
  /** Stores the owner has a registry at: linked in Settings or read by the extension. */
  storesWithRegistries: Set<StoreId>;
}

const PREV = '<path d="m15 18-6-6 6-6"/>';
const NEXT = '<path d="m9 18 6-6-6-6"/>';
const MINUS = '<path d="M5 12h14"/>';
const PLUS = '<path d="M5 12h14"/><path d="M12 5v14"/>';

/** The "Add to Regibee" form for the product on the page, like the site's add-item dialog. */
function showProduct(ctx: ProductContext) {
  const { user, product, registries } = ctx;
  let registryId = ctx.registryId;
  let imageIndex = 0;
  let quantity = 1;
  const registry = () => registries.find((r) => r.id === registryId)!;
  const link = classifyStoreLink(product.url);

  // ── Picture ──
  const picture = h("img", { className: "product-image", alt: "", referrerpolicy: "no-referrer" }) as HTMLImageElement;
  const counter = h("span", { className: "muted", "aria-live": "polite" });
  const showImage = () => {
    if (product.images.length === 0) {
      picture.removeAttribute("src");
      return;
    }
    picture.src = product.images[imageIndex];
    counter.textContent = `${imageIndex + 1} of ${product.images.length}`;
  };
  const step = (by: number) => () => {
    imageIndex = (imageIndex + by + product.images.length) % product.images.length;
    showImage();
  };
  const gallery = h(
    "div",
    { className: "gallery" },
    product.images.length > 0 ? picture : h("span", { className: "product-image", "aria-hidden": "true" }),
    product.images.length > 1 &&
      h(
        "div",
        { className: "gallery-controls" },
        h("button", { type: "button", className: "icon-button", "aria-label": "Previous picture", onclick: step(-1) }, icon(PREV)),
        counter,
        h("button", { type: "button", className: "icon-button", "aria-label": "Next picture", onclick: step(1) }, icon(NEXT))
      )
  );
  showImage();

  // ── Fields ──
  const title = h("textarea", { id: "title", rows: 3, maxlength: 300, required: true }) as HTMLTextAreaElement;
  title.value = product.title;
  const price = h("input", { id: "price", type: "text", inputmode: "decimal", placeholder: "0.00", autocomplete: "off" }) as HTMLInputElement;
  if (product.price !== null) price.value = product.price.toFixed(2);
  const qty = h("input", { id: "quantity", type: "number", min: 1, max: 99, value: 1, className: "stepper-value" }) as HTMLInputElement;
  const setQuantity = (value: number) => {
    quantity = Math.min(Math.max(Math.round(value) || 1, 1), 99);
    qty.value = String(quantity);
  };
  qty.addEventListener("change", () => setQuantity(Number(qty.value)));

  const category = h("select", { id: "category" }) as HTMLSelectElement;
  const fillCategories = () => {
    category.replaceChildren(
      h("option", { value: "" }, "No category"),
      ...registry().categories.map((c) => h("option", { value: c.id }, c.name))
    );
  };
  fillCategories();

  const essential = h("input", { type: "checkbox", id: "essential" }) as HTMLInputElement;
  const openToUsed = h("input", { type: "checkbox", id: "used" }) as HTMLInputElement;
  const condition = h(
    "select",
    { id: "condition" },
    ...USED_CONDITIONS.map((c) => h("option", { value: c.id }, c.label))
  ) as HTMLSelectElement;
  const conditionField = h("div", { className: "field", hidden: true }, h("label", { for: "condition" }, "Minimum condition"), condition);
  openToUsed.addEventListener("change", () => {
    conditionField.hidden = !openToUsed.checked;
  });
  const notes = h("textarea", {
    id: "notes",
    rows: 2,
    maxlength: 1000,
    placeholder: "For example, which size or color you'd like.",
  }) as HTMLTextAreaElement;

  // ── Notices: the registry link, and whether it's already on Regibee ──
  let linkNote: HTMLElement | null = null;
  if (link?.kind === "registry") {
    linkNote = h(
      "p",
      { className: "ok-note" },
      icon(CHECK, 14),
      h("span", {}, `${link.store.name} registry link. Gifts bought through it count toward your ${link.store.name} registry.`)
    );
  } else if (link?.kind === "plain" && ctx.storesWithRegistries.has(link.store.id)) {
    linkNote = h(
      "p",
      { className: "note" },
      `This is a plain ${link.store.name} link, so gifts bought through it won't count toward your ${link.store.name} registry. Add it to your ${link.store.name} registry first, then open it from there and add it to Regibee.`
    );
  }
  const duplicateNote = h("p", { className: "note", hidden: true });
  const error = h("p", { className: "error", role: "alert", hidden: true });
  const button = h("button", { type: "button", className: "button primary" }, "Add to Regibee") as HTMLButtonElement;

  const checkDuplicate = async () => {
    duplicateNote.hidden = true;
    button.disabled = false;
    button.textContent = "Add to Regibee";
    const result = await ask<{ exists: boolean }>({ type: "check-url", registryId, url: product.url });
    if (result.ok && result.data.exists) {
      duplicateNote.replaceChildren(
        `This item is already on ${registry().title}. `,
        h(
          "a",
          {
            href: `${REGIBEE_URL}/dashboard/registry/${registryId}`,
            onclick: (e: Event) => {
              e.preventDefault();
              openTab(`${REGIBEE_URL}/dashboard/registry/${registryId}`);
            },
          },
          "View it on Regibee"
        )
      );
      duplicateNote.hidden = false;
      button.disabled = true;
      button.textContent = "Already on this registry";
    }
  };

  const registryField = registrySelect(registries, registryId, "Registry", async (id) => {
    registryId = id;
    fillCategories();
    await ask({ type: "set-registry", registryId: id });
    await checkDuplicate();
  });

  button.addEventListener("click", async () => {
    error.hidden = true;
    const name = title.value.replace(/\s+/g, " ").trim();
    if (!name) {
      error.textContent = "Give the item a name.";
      error.hidden = false;
      title.focus();
      return;
    }
    const priceText = price.value.replace(/[$,\s]/g, "");
    const priceValue = priceText ? Number(priceText) : null;
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      error.textContent = "Enter the price as a number, like 24.99.";
      error.hidden = false;
      price.focus();
      return;
    }
    const item: ProductItem = {
      url: product.url,
      title: name,
      price: priceValue,
      imageUrl: product.images[imageIndex] ?? null,
      quantity,
      categoryId: category.value || null,
      isEssential: essential.checked,
      isOpenToUsed: openToUsed.checked,
      minimumCondition: openToUsed.checked ? (condition.value as ProductItem["minimumCondition"]) : null,
      notes: notes.value.trim() || null,
    };
    button.disabled = true;
    button.textContent = "Adding…";
    const result = await ask<AddProductResponse>({ type: "add-product", registryId, item });
    if (!result.ok) {
      if (result.notConnected) return showConnect(true);
      error.textContent = result.error;
      error.hidden = false;
      button.disabled = false;
      button.textContent = "Add to Regibee";
      return;
    }
    if ("duplicate" in result.data) {
      await checkDuplicate();
      return;
    }
    showProductAdded(user, registryId, registry().title, link?.kind === "registry" ? link.store.name : null);
  });

  const field = (id: string, label: string, control: Node, extra?: string) =>
    h("div", { className: `field${extra ? ` ${extra}` : ""}` }, h("label", { for: id }, label), control);

  render(
    header(user),
    h(
      "main",
      { className: "body product" },
      h("h1", { className: "sr-only" }, "Add this item to Regibee"),
      h(
        "div",
        { className: "form-scroll" },
        h("div", { className: "product-top" }, gallery, field("title", "Name", title, "grow")),
        linkNote,
        duplicateNote,
        h(
          "div",
          { className: "row" },
          field("price", "Price", h("div", { className: "money" }, h("span", { "aria-hidden": "true" }, "$"), price)),
          field(
            "quantity",
            "Quantity",
            h(
              "div",
              { className: "stepper" },
              h("button", { type: "button", className: "icon-button", "aria-label": "Fewer", onclick: () => setQuantity(quantity - 1) }, icon(MINUS)),
              qty,
              h("button", { type: "button", className: "icon-button", "aria-label": "More", onclick: () => setQuantity(quantity + 1) }, icon(PLUS))
            )
          )
        ),
        h("div", { className: "row" }, registryField, field("category", "Category", category)),
        h(
          "div",
          { className: "checks" },
          h("label", { className: "check" }, essential, "Most wanted"),
          h("label", { className: "check" }, openToUsed, "Open to used")
        ),
        conditionField,
        field("notes", "Note for friends and family (optional)", notes)
      ),
      h("div", { className: "footer-actions" }, error, button)
    )
  );
  void checkDuplicate();
}

function showProductAdded(user: { name: string }, registryId: string, registryTitle: string, registryStore: string | null) {
  render(
    header(user),
    h(
      "main",
      { className: "body" },
      h(
        "div",
        { className: "done", role: "status" },
        icon(CIRCLE_CHECK, 36),
        h("h1", {}, "Added to Regibee"),
        h(
          "p",
          { className: "lead" },
          registryStore
            ? `It's on ${registryTitle}, with its ${registryStore} registry link.`
            : `It's on ${registryTitle}.`
        )
      ),
      h(
        "div",
        { className: "footer-actions" },
        h(
          "button",
          { type: "button", className: "button primary", onclick: () => openTab(`${REGIBEE_URL}/dashboard/registry/${registryId}`) },
          "Review on Regibee"
        )
      )
    )
  );
}

function handleFailure(result: Extract<Result<unknown>, { ok: false }>, user: { name: string } | null, retry: () => void) {
  if (result.notConnected) showConnect(true);
  else showError(user, result.error || "Something went wrong.", retry);
}

// ── Start ────────────────────────────────────────────────────────────────

/** The tab the popup is about. Tests open the popup as a page with ?tab=<id>. */
async function targetTab(): Promise<chrome.tabs.Tab | null> {
  const fromQuery = Number(new URLSearchParams(location.search).get("tab"));
  if (fromQuery) return chrome.tabs.get(fromQuery).catch(() => null);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function readTab(tab: chrome.tabs.Tab | null): Promise<ReadResult | null> {
  if (tab?.id === undefined) return null;
  try {
    const result = (await chrome.tabs.sendMessage(tab.id, { type: "read" } satisfies ContentRequest)) as ReadResult | undefined;
    return result ?? null;
  } catch {
    // No content script there: not a store page, or it loaded before the extension.
    return null;
  }
}

/** The product on the tab, read in the page. Works on any site because the owner clicked the button. */
async function readProduct(tab: chrome.tabs.Tab | null): Promise<ProductPage | null> {
  if (tab?.id === undefined) return null;
  try {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readProductPage });
    const page = injection?.result as ProductPage | undefined;
    return page?.title && /^https?:/i.test(page.url) ? page : null;
  } catch {
    // Pages the extension can't run on: chrome:// pages, the Web Store, PDFs.
    return null;
  }
}

function storesWithRegistries(state: PopupState, registry: ExtensionRegistry | undefined): Set<StoreId> {
  return new Set<StoreId>([
    ...(registry?.storeRegistries ?? []).map((r) => r.store),
    ...(Object.keys(state.lastChecked) as StoreId[]),
  ]);
}

async function start() {
  render(header(null), h("main", { className: "body" }, h("p", { className: "muted" }, "Loading…")));

  const stateResult = await ask<PopupState>({ type: "state" });
  if (!stateResult.ok) return showError(null, stateResult.error, start);
  const state = stateResult.data;
  if (!state.connected) return showConnect();

  const tab = await targetTab();
  const [registriesResult, read] = await Promise.all([ask<RegistriesResult>({ type: "registries" }), readTab(tab)]);
  if (!registriesResult.ok) return handleFailure(registriesResult, state.user, start);
  const data = registriesResult.data;
  const user = data.user;
  if (data.registries.length === 0 || !data.registryId) return showNoRegistries(user);

  if (read?.store) {
    const store = getStore(read.store);
    if (read.items.length === 0) return showCouldntRead(user, store, start);
    return showImport({
      user,
      store,
      items: read.items,
      registries: data.registries,
      registryId: data.registryId,
      mode: state.mode,
      reload: start,
    });
  }

  const page = await readProduct(tab);
  if (page?.isProduct) {
    return showProduct({
      user,
      product: page,
      registries: data.registries,
      registryId: data.registryId,
      storesWithRegistries: storesWithRegistries(state, data.registries.find((r) => r.id === data.registryId)),
    });
  }
  showHome(state, user, data, page);
}

void start();
