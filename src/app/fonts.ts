import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

// The root layout and Storybook's preview both import these, so stories
// render with the same fonts as the site.

// Body text and controls.
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings and the wordmark (--font-display in src/styles/theme.css). The
// optical-size axis makes large headings tighter and small ones more open.
export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const fontVariables = [geistSans.variable, geistMono.variable, bricolage.variable].join(" ");
