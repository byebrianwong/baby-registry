import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regibee - One Registry, Every Occasion",
  description:
    "Create a registry for a baby shower, birthday, Christmas, wedding, or any occasion — with items from any store. Share one link with friends and family.",
  // The web app manifest comes from manifest.ts and the home screen icon
  // from apple-icon.png. These name the app and keep its own window when an
  // owner adds it to an iPhone's home screen.
  applicationName: "Regibee",
  appleWebApp: {
    capable: true,
    title: "Regibee",
    statusBarStyle: "default",
  },
};

// Zooming stays allowed. Form fields are 16px or larger, so iOS has no reason
// to zoom in when one gets focus.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables go on <html> because theme tokens such as
    // --font-display are defined on :root and resolve var() there.
    <html lang="en" className={fontVariables}>
      <body
        className="font-sans antialiased"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
