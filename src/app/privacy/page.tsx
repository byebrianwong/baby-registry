import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { PrivacyPolicy } from "@/components/privacy-policy";

// The app stores and the Chrome Web Store link here. The markup is in
// PrivacyPolicy, so Storybook can show it.
export const metadata: Metadata = {
  title: "Privacy policy | Regibee",
  description:
    "What Regibee collects from registry owners and guests, why, who else handles it, and how to see, change or delete it.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy nav={<Nav />} />;
}
