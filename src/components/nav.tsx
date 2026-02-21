"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.is_anonymous) {
        setUser({ email: user.email });
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isPublicRegistry = pathname.startsWith("/r/");

  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <Baby className="h-5 w-5 text-primary" />
          <span>BabyList</span>
        </Link>

        {!isPublicRegistry && (
          <>
            <nav className="ml-6 hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors hover:text-foreground ${
                    pathname === link.href
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {loading ? null : user ? (
                <>
                  <span className="hidden text-sm text-muted-foreground md:inline">
                    {user.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/signup">Sign up</Link>
                  </Button>
                </>
              )}

              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <nav className="flex flex-col gap-4 pt-8">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-sm font-medium"
                      >
                        {link.label}
                      </Link>
                    ))}
                    {user && (
                      <button
                        onClick={handleSignOut}
                        className="text-sm text-muted-foreground text-left"
                      >
                        Sign out
                      </button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
