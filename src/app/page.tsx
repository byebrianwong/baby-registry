import { LandingPage } from "@/components/landing-page";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <LandingPage ctaHref={user ? "/dashboard" : "/signup"} />;
}
