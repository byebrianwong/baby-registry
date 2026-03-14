"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

export function Nav() {
  const pathname = usePathname();
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

  const isPublicRegistry = pathname.startsWith("/r/");

  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <Baby className="h-5 w-5 text-brand-600" />
          <span>Regibee</span>
        </Link>

        {!isPublicRegistry && (
          <>
            <nav className="ml-6 hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors hover:text-primary ${
                    pathname === link.href
                      ? "text-primary font-medium"
                      : "text-tertiary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {loading ? null : user ? (
                <span className="text-sm text-tertiary">
                  {user.email}
                </span>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-tertiary hover:text-primary transition-colors">Log in</Link>
                  <Link href="/signup" className="text-sm text-tertiary hover:text-primary transition-colors">Sign up</Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
