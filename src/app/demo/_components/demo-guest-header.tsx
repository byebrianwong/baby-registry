import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

/** The logo bar on the demo's guest pages, with a way back to the dashboard. */
export function DemoGuestHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
        <Button variant="outline" size="sm" asChild>
          <Link href="/demo/dashboard">
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3 w-3 shrink-0" />
              Demo dashboard
            </span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
