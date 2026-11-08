import { NextResponse } from "next/server";
import { authenticateExtension, endExtensionSession } from "@/lib/extension-server";

// POST → ends the extension's own session. The website stays signed in.
export async function POST(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  await endExtensionSession(auth.accessToken);
  return NextResponse.json({ ok: true });
}
