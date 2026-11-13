// The account behind an API request, for routes that both the website and
// the iPhone and Android app call. The website sends its cookie session. The
// app sends its session's access token as "Authorization: Bearer <token>".

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/utils/supabase/server";

type RequestAccount = { user: User; response?: undefined } | { response: NextResponse; user?: undefined };

function refuse(error: string, status: number) {
  return { response: NextResponse.json({ error }, { status }) };
}

export async function requestAccount(request: Request): Promise<RequestAccount> {
  const header = request.headers.get("authorization");
  let user: User | null = null;

  if (header) {
    // A header that's there but wrong is refused, not swapped for the cookie.
    const accessToken = header.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!accessToken) return refuse("Sign in first.", 401);
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error) return refuse("Sign in first.", 401);
    user = data.user;
  } else {
    // Cookies go with any request the browser makes to this site, so only
    // accept them from the site's own pages. Browsers that don't send
    // Sec-Fetch-Site still won't send the cookies cross-site (they're
    // SameSite=Lax), or a DELETE without asking this site first.
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return refuse("Not allowed.", 403);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) return refuse("Sign in first.", 401);
  // Guests get anonymous sessions when they reserve a gift. Those aren't accounts.
  if (user.is_anonymous) return refuse("Guests don't have an account.", 403);
  return { user };
}
