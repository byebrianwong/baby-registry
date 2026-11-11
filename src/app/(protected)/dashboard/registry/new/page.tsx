import { redirect } from "next/navigation";
import { CreateRegistryForm } from "@/components/create-registry-form";
import { getSessionUser } from "@/lib/viewer";

export default async function NewRegistryPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Guests have anonymous sessions and no profile page.
  return <CreateRegistryForm canListOnProfile={!user.is_anonymous} />;
}
