import { NextResponse } from "next/server";
import { deleteAccount, planAccountDeletion, summarizeAccountDeletion } from "@/lib/account-deletion";
import { requestAccount } from "@/lib/request-account";

export const dynamic = "force-dynamic";

// The signed-in account, from the website (cookie session) or the app
// (Authorization: Bearer <access token>). Each request only ever acts on its
// own account: there's no id to pass.

// GET → what deleting the account would do, for the confirmation.
export async function GET(request: Request) {
  const auth = await requestAccount(request);
  if (auth.response) return auth.response;

  try {
    const plan = await planAccountDeletion(auth.user.id);
    return NextResponse.json(summarizeAccountDeletion(plan));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "We couldn't check your account. Try again." }, { status: 500 });
  }
}

// DELETE → deletes the account. See src/lib/account-deletion.ts for what goes.
export async function DELETE(request: Request) {
  const auth = await requestAccount(request);
  if (auth.response) return auth.response;

  try {
    await deleteAccount(auth.user.id);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "We couldn't delete your account. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
