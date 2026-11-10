"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [fullName, setFullName] = useState("");
  const [findable, setFindable] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const siteUrl = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // Read by the handle_new_user trigger, which sets both search
          // settings on the new profile (017_profile_links_and_email_search.sql).
          findable,
        },
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, session will be null
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto flex items-center gap-2 font-semibold mb-4">
              <Logo size="lg" />
            </Link>
            <CardTitle className="text-2xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-secondary">
              We sent a confirmation link to <strong>{email}</strong>.
            </p>
            <p className="text-tertiary text-sm">
              Click the link in the email to verify your account and continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto flex items-center gap-2 font-semibold mb-4">
            <Logo size="lg" />
          </Link>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Start building your registry today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Remi & Max Porter"
              autoComplete="name"
              enterKeyHint="next"
              value={fullName}
              onChange={(val) => setFullName(val)}
              isRequired
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              enterKeyHint="next"
              value={email}
              onChange={(val) => setEmail(val)}
              isRequired
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              enterKeyHint="go"
              value={password}
              onChange={(val) => setPassword(val)}
              isRequired
              minLength={6}
            />
            <Checkbox
              isSelected={findable}
              onChange={setFindable}
              label="Let friends find me on Regibee"
              hint="Signed-in people can find you by name, or by your email address if they already know it. Your email is never shown."
            />
            {error && (
              <p className="text-sm text-error-primary">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-tertiary">
            Already have an account?{" "}
            <Link href={redirectTo !== "/dashboard" ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"} className="text-brand-600 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
