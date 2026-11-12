import { NextResponse, type NextRequest } from "next/server";
import { processEventReminders } from "@/lib/event-reminders-server";

export const dynamic = "force-dynamic";

// Vercel Cron calls this once a day (see vercel.json) to email everyone going
// to tomorrow's events. Vercel sends the CRON_SECRET env var as a bearer
// token, so without it nothing runs.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processEventReminders();
  return NextResponse.json(result);
}
