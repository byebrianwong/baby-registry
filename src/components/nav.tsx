"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby, LogOut, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.is_anonymous) {
        setUser({ email: user.email });
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
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
    <header className="sticky top-0 z-50 w-full border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
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
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="text-sm text-tertiary hover:text-primary transition-colors"
                  >
                    {user.email}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 rounded-md border bg-primary shadow-lg py-1 z-50">
                      <Link
                        href="/dashboard/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-tertiary hover:bg-secondary hover:text-primary transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Account
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-tertiary hover:bg-secondary hover:text-primary transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
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
