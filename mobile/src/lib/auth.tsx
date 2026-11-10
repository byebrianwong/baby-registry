import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { DEMO_USER_ID, setDemoActive } from "@/lib/demo";
import { queryClient } from "@/lib/query";
import { supabase, SITE_URL } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  /** Looking around with sample data, without an account. */
  demo: boolean;
  /** The signed-in user's id, or the demo's. Empty when signed out. */
  userId: string;
  /** False until the saved session has been read from storage. */
  isReady: boolean;
  startDemo: () => void;
  endDemo: () => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  demo: false,
  userId: "",
  isReady: false,
  startDemo: () => {},
  endDemo: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(usable(data.session));
      setIsReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(usable(next));
      setIsReady(true);
      // Signing in ends the demo.
      if (next) {
        setDemoActive(false);
        setDemo(false);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Data hooks read the demo flag outside React. Keep it in step with this state.
  setDemoActive(demo && !session);

  const value: AuthState = {
    session,
    demo,
    userId: session?.user.id ?? (demo ? DEMO_USER_ID : ""),
    isReady,
    startDemo: () => {
      setDemoActive(true);
      setDemo(true);
    },
    endDemo: () => {
      setDemoActive(false);
      setDemo(false);
      queryClient.removeQueries({ queryKey: ["registries", DEMO_USER_ID] });
      queryClient.removeQueries({ queryKey: ["registry"] });
      queryClient.removeQueries({ queryKey: ["gifts"] });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Guests get anonymous sessions on the website when they reserve a gift.
// Those aren't accounts, so the app treats them as signed out.
function usable(session: Session | null) {
  return session && !session.user.is_anonymous ? session : null;
}

export function useSession() {
  return useContext(AuthContext);
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/**
 * Creates an account the same way the website's sign-up page does. When the
 * project asks people to confirm their email address, there's no session yet
 * and this returns "confirm".
 */
export async function signUp(input: { fullName: string; email: string; password: string; findable: boolean }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        // Read by the handle_new_user trigger (017_profile_links_and_email_search.sql).
        findable: input.findable,
      },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    },
  });
  if (error) throw error;
  return data.session ? "signed-in" : "confirm";
}

/** Sends the website's password reset email. The link opens the website's reset page. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  // "local" ends only this phone's session. The website stays signed in.
  await supabase.auth.signOut({ scope: "local" });
}
