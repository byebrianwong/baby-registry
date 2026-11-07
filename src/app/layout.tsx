import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regibee - One Registry, Every Occasion",
  description:
    "Create a registry for a baby shower, birthday, Christmas, wedding, or any occasion — with items from any store. Share one link with friends and family.",
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
      <head>
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
      </head>
      <body
        className="font-sans antialiased"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
