import { redirect } from "next/navigation";
import { SavedItems } from "@/components/saved-items";
import { loadSavedItems } from "@/lib/saved-items";
import { getSessionUser } from "@/lib/viewer";

// Every item on every list you own, once each, with the lists it's on.
export default async function SavedPage() {
  // The top bar and the tabs look up the same user, and the lookup is cached
  // per request.
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Guests have anonymous sessions from reserving a gift, which get past the
  // /dashboard check, but they have no lists of their own.
  if (user.is_anonymous) {
    redirect("/signup?redirect=/dashboard/saved");
  }

  const { lists, items } = await loadSavedItems(user.id);
  return <SavedItems lists={lists} items={items} />;
}
