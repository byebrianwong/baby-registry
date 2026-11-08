import { NextResponse } from "next/server";
import { jsonError, readJson, refreshExtensionSession } from "@/lib/extension-server";

// POST { refresh_token } → a new extension session. The extension calls this
// when its access token is about to expire.
export async function POST(request: Request) {
  const body = await readJson(request);
  const refreshToken = body?.refresh_token;
  if (typeof refreshToken !== "string" || !refreshToken || refreshToken.length > 500) {
    return jsonError("Missing refresh token", 400);
  }

  const session = await refreshExtensionSession(refreshToken);
  if (!session) return jsonError("Not connected", 401);
  return NextResponse.json(session);
}
