import { LandingPage } from "@/components/landing-page";
import { Nav } from "@/components/nav";
import { getSessionUser } from "@/lib/viewer";

export default async function HomePage() {
  // The top bar looks up the same user, and the lookup is cached per request.
  const user = await getSessionUser();
  const ctaHref = user ? "/dashboard" : "/signup";
  return <LandingPage ctaHref={ctaHref} nav={<Nav />} />;
}
