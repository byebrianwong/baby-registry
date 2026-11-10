import { LandingPage } from "@/components/landing-page";
import { Nav } from "@/components/nav";
import { getViewer } from "@/lib/viewer";

export default async function HomePage() {
  // Same check as the nav, so a gift giver's guest session still counts as
  // signed out and sees the sign-up buttons.
  const viewer = await getViewer();
  return <LandingPage signedIn={Boolean(viewer)} nav={<Nav />} />;
}
