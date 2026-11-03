import { LandingPage } from "@/components/landing-page";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ctaHref = user ? "/dashboard" : "/signup";
  return <LandingPage ctaHref={ctaHref} />;
}
