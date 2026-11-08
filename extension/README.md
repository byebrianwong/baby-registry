# Regibee browser extension

A Chrome extension that brings the items on an owner's store registries into Regibee, with each item's registry link, so gifts bought through Regibee still count toward the store registry. It also works in Edge, Brave and Arc.

## What it does

- **Reads store registry pages.** When the owner opens their registry on Amazon, Target, Walmart or Pottery Barn Kids, the extension reads the items on that page: name, price, picture, how many are wanted, and the registry link guests should use.
- **Skips what's already on Regibee.** It matches items on the store's product ID inside each link, so an item already on Regibee with a plain link counts as the same item.
- **Ask first, or automatic.** By default, the toolbar button shows how many new items a registry page has, and the popup lists them with checkboxes. In automatic mode it adds new items on its own and shows a notice with Undo. Automatic mode never re-adds an item the owner already saw, left out, removed or undid.
- **Adds one item from any product page.** On a product page at any shop, the popup opens an "Add to Regibee" form filled in from the page: name, price, pictures to choose from, quantity, registry, category, most wanted, open to used with a minimum condition, and a note. It keeps the page's address exactly, so a product opened from a store registry keeps its registry link, and it says so. On a plain link at a store where the owner has a registry, it explains that gifts bought through it won't count. On a page that doesn't look like a product, the home screen offers "Add this page to Regibee".

The product form reads the page only after the owner clicks the toolbar button, using Chrome's `activeTab` and `scripting` permissions. Neither adds an install warning, and the extension still can't see other pages. The reader is `src/product-reader.ts`. It uses the page's structured product data where there is some, and reads Amazon's, Target's and Walmart's product blocks for the price and pictures they leave out. On real pages it read the name, price and every product picture from an Amazon page opened from a registry (keeping `colid` and `coliid`), a Target page and a Walmart page.

## How it signs in

The extension never sees a password. Its first run opens `/extension/connect` on regibee.com. When the owner clicks Connect there, the server creates a separate Supabase session just for the extension, and the page hands it to the extension's content script. Requests then carry that session's access token and run under the same access rules (RLS) as the website. Disconnecting ends only the extension's session, not the website's.

The server side is in `src/app/api/extension/*`, `src/lib/extension-server.ts` and `src/app/extension/connect`. Code shared with the extension is in `src/lib/extension.ts` and `src/lib/retailers.ts`.

## Build and load it

```bash
npm run extension:build
```

That builds `extension/dist` for https://www.regibee.com. To work against a local dev server (`npm run dev`) instead:

```bash
npm run extension:dev
```

This builds for http://localhost:3000 and rebuilds on changes. A local dev server uses the production database, so items you import locally are real.

To load it in Chrome: open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and choose `extension/dist`. After a rebuild, click the reload button on the extension's card.

The API routes and the Connect page have to be deployed before a build for regibee.com can connect.

## Stores

Everything store-specific is in `src/lib/retailers.ts`: link rules, product IDs, which pages list the owner's items (`registryPage`), and whether someone has checked that the extension can read them (`verified`). The manifest's site access comes from the same list, so a store added there is picked up on the next build.

| Store | Reads | Checked on a real registry |
| --- | --- | --- |
| Amazon | The owner's "Your registry" page | Yes: all 29 items, with links, names and pictures; prices for all but unavailable items |
| Walmart | The registry page | Yes: all 23 items; prices for all but out-of-stock items |
| Target | The owner's view, `gift-registry/my-registry` | No. The guest view has no item links, so the popup asks for the owner's view |
| Pottery Barn Kids | Registry pages | No |
| Babylist | Nothing yet | We don't know its registry link format |

The reader (`src/reader.ts`) works the same way for every store: it finds the registry item links by the store's rules, then reads each item from the smallest part of the page around its links that holds no other item. It doesn't depend on a store's class names, but a redesign can still break it. When it finds nothing, the popup says so and points to the copy-link steps.

## Before publishing to the Chrome Web Store

- Check the Target owner view and a Pottery Barn Kids registry page, then mark them `verified`.
- Write a privacy policy page. The store asks for one because the extension reads registry pages and holds a Regibee session.
- A Safari version needs an Apple developer account and an Xcode wrapper.
