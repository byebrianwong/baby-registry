import type { MetadataRoute } from "next";

// Lets owners add Regibee to their phone's home screen. Guests never need to:
// every guest page works in the browser from a texted link.
//
// On Android, an installed Regibee also shows up in the share sheet. Sharing
// a product from a store's app or the browser opens /share with what was
// shared (see src/app/share/page.tsx). iOS Safari doesn't support share
// targets, so iPhone sharing is left to the native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Regibee",
    short_name: "Regibee",
    description: "One registry for every occasion, with gifts from any store.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // White, like the site's header, so the phone's status bar blends in.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
