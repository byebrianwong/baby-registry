"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/base/input/input";
import { Skeleton } from "@/components/ui/skeleton";
import { accountDeletionLines, type AccountDeletionSummary } from "@/lib/account-deletion-summary";

// What the person types to confirm.
const CONFIRM_WORD = "delete";

type Result = { error?: string };

async function loadFromApi(): Promise<AccountDeletionSummary> {
  const response = await fetch("/api/account", { cache: "no-store" });
  if (!response.ok) throw new Error("We couldn't check your account. Try again.");
  return response.json();
}

async function deleteWithApi(): Promise<Result> {
  try {
    const response = await fetch("/api/account", { method: "DELETE" });
    if (response.ok) return {};
    const body = await response.json().catch(() => null);
    return { error: body?.error ?? "We couldn't delete your account. Try again." };
  } catch {
    return { error: "We couldn't reach Regibee. Check your connection and try again." };
  }
}

/**
 * The Account page's last card. Its dialog says what deleting the account
 * does, asks the person to type "delete", then deletes it with
 * DELETE /api/account, signs out and goes to the home page.
 */
export function DeleteAccountCard({
  loadSummary = loadFromApi,
  deleteAction = deleteWithApi,
}: {
  /** Stand-ins for the API. The demo and stories pass them. */
  loadSummary?: () => Promise<AccountDeletionSummary>;
  deleteAction?: () => Promise<Result>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AccountDeletionSummary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setSummary(null);
    setLoadError("");
    try {
      setSummary(await loadSummary());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We couldn't check your account. Try again.");
    }
  };

  const openDialog = () => {
    setTyped("");
    setError("");
    setOpen(true);
    load();
  };

  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const result = await deleteAction();
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    // The account and its sessions are gone. This clears the browser's copy.
    const { createClient } = await import("@/utils/supabase/client");
    await createClient().auth.signOut({ scope: "local" });
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <Card className="border-error-primary/50">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Deletes your account, your registries and events, and your profile. Registries other
            people help manage stay with them. This can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive-outline" onClick={openDialog}>
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>This can&apos;t be undone. Deleting your account does this:</DialogDescription>
          </DialogHeader>

          {loadError ? (
            <div className="space-y-3">
              <p className="text-sm text-error-primary">{loadError}</p>
              <Button variant="outline" size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          ) : summary ? (
            <ul className="list-disc space-y-2 pl-5 text-sm text-secondary">
              {accountDeletionLines(summary).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2" aria-label="Checking your account" role="status">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmed && summary && !deleting) handleDelete();
            }}
            className="space-y-4"
          >
            <Input
              label={`Type “${CONFIRM_WORD}” to confirm`}
              value={typed}
              onChange={setTyped}
              autoComplete="off"
              spellCheck="false"
              isDisabled={deleting}
            />
            {error && <p className="text-sm text-error-primary">{error}</p>}
            <DialogFooter sticky>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={!confirmed || !summary || deleting}>
                {deleting ? "Deleting..." : "Delete account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
