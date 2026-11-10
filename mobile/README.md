# Regibee for iPhone and Android

The Regibee app for registry owners, built with Expo (SDK 58) and React Native. Guests don't need it: they keep using the registry link on the website.

## What it does

- **Share to Regibee from any app.** In the Amazon, Target or Walmart app, in Safari, Chrome or Instagram, tap Share and pick Regibee. The add form opens with the product's name, price and pictures filled in. It picks the registry you used last.
- **Reads products on the phone.** A page shared from Safari arrives already read: the share extension runs the Chrome extension's reader (`extension/src/product-reader.ts`) inside the page. A link shared from another app, or pasted, is opened in a hidden web view on the phone, and the same reader reads it. The page loads over the owner's own connection, so stores that block Regibee's server, Amazon above all, still work.
- **Paste a link.** On iPhone it's Apple's own Paste button, so there's no "Allow Paste" prompt.
- **Catches duplicates.** A link already on the registry, matched on the store's product ID the same way as the website and extension, gets a warning first.
- **Manage registries.** See every registry you own or help manage, with progress, value and the latest gift. Add, edit and delete items. Mark them most wanted, bought it yourself, or open to used. Filter by category and make new categories. Long-press an item on iPhone for quick actions.
- **Gift activity.** See who reserved or bought what, with their messages and funds' totals. Email a giver, or cancel a reservation.
- **Make a registry.** Baby registries start with the website's 10 categories.
- **Fast.** Registries are cached on the phone (SQLite), so the app opens straight onto the last data it saw and refreshes in the background. Changes show at once and roll back if they fail.
- **Look around first.** The sign-in screen offers the website's demo registry, kept in memory. Nothing in the demo is saved.
- Light and dark mode, Regibee's colors and fonts, SF Symbols on iPhone and Material Symbols on Android, native tabs and sheets, and haptics.

The website still does events, following, profile settings, co-managers, cash fund setup, guest suggestions and registry settings. The app links to those pages.

## How it fits together

- It signs in to the same Supabase project as the website, with email and password, and reads and writes the tables directly as the signed-in user. The access rules (RLS) apply exactly as on the website. It only has the public anon key. See "Keys and access rules" in the root [CLAUDE.md](../CLAUDE.md).
- `src/lib/data.ts` holds every query and change, written to match the website's server actions in `src/lib/actions/registry.ts`. Change one, check the other.
- The store link rules (`src/lib/retailers.ts`) and the demo data (`src/lib/demo-data.ts`) come straight from the website, through the `@shared/*` path. `metro.config.js` lets Metro read that folder. Only files without imports can be shared this way.
- The product reader is built from the extension's source into `src/generated/product-reader.json` by `npm run product-reader`. Run it after changing `extension/src/product-reader.ts`. `npm run check` fails when it's out of date.
- Sharing uses [`expo-share-intent`](https://github.com/achorein/expo-share-intent). On iPhone its share extension opens the app (the extension has no screen of its own), and `src/app/+native-intent.ts` sends that link to the share screen. On Android the app is a share target for text. `plugins/with-share-extension-label.js` keeps the share sheet label "Regibee".

## Setup

You need Node 22 or later. In this folder:

```bash
npm install
cp .env.local.example .env.local
```

Fill in `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. It's the website's `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from `vercel env pull`). Like the website, the app uses the production database, so anything you do while signed in changes real data. Use the demo to try things.

## Run it

Sharing and the product reader need native code, so the app doesn't run in Expo Go. Build a development app once, then reload JavaScript changes instantly:

- **iPhone simulator:** install Xcode from the App Store, then `npm run ios`.
- **Android emulator:** install Android Studio, then `npm run android`.
- **A real phone, without Xcode:** `npx eas-cli@latest build --profile development --platform ios` (or `android`) builds in Expo's cloud and gives you a link to install. It needs an Expo account, and for iPhone an Apple Developer account. Add the anon key to the build once: `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key> --visibility plaintext --environment development --environment preview --environment production`.

`npm run web` opens a browser preview of the screens. It can't read other sites' pages or share, so use it for layout only.

## Checks

```bash
npm run typecheck
npm run lint
npm run check   # product reader up to date, types, and a full iOS and Android bundle
npx expo-doctor
```

The root `tsconfig.json` leaves out `mobile/`, so the website's checks don't read the app.

## Before the stores

- **Account deletion.** Apple requires apps that create accounts to let people delete them in the app. Regibee has no way to delete an account yet, on the website or here. It needs a server route with the service-role key.
- **Privacy policy.** Both stores ask for a link. The extension needs one too.
- **Store accounts.** An Apple Developer account and a Google Play developer account. The bundle id is `com.regibee.app` for both, set in `app.config.ts`. Change it before the first upload if you want another.
- **Real phones.** Sharing from Amazon, Target, Walmart and Safari, and reading in the hidden web view, have only been checked in code and in a browser so far. Try each on an iPhone and an Android phone.
- **App group.** The iPhone share extension shares data with the app through `group.com.regibee.app`. EAS sets it up when it manages your credentials.
