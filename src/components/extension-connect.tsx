"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { connectExtension } from "@/lib/actions/extension";
import {
  isExtensionMessage,
  PAGE_SOURCE,
  type PageMessage,
} from "@/lib/extension";
import { EXTENSION_STORES } from "@/lib/retailers";

export type ConnectStatus = "checking" | "missing" | "ready" | "connecting" | "connected" | "error";

// "Amazon, Target, Walmart and Pottery Barn Kids"
function listStores(): string {
  const names = EXTENSION_STORES.map((s) => s.name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
}

interface ExtensionConnectCardProps {
  /** Who's signed in on the site. */
  name: string;
  status: ConnectStatus;
  error?: string | null;
  onConnect?: () => void;
  onCancel?: () => void;
}

/** The Connect page's markup, without the messaging, so Storybook can show every state. */
export function ExtensionConnectCard({ name, status, error, onConnect, onCancel }: ExtensionConnectCardProps) {
  const busy = status === "connecting";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-secondary px-4 py-10">
      <Link href="/" className="rounded-md">
        <Logo />
      </Link>

      <section className="w-full max-w-lg rounded-2xl border border-secondary bg-primary p-7 shadow-xs">
        {status === "connected" ? (
          <div className="flex flex-col items-center gap-3 text-center" role="status">
            <CheckCircle2 className="size-10 text-success-600" aria-hidden="true" />
            <h1 className="font-display text-display-xs font-semibold text-primary">The extension is connected</h1>
            <p className="text-sm text-tertiary">
              Open one of your store registries and click the Regibee button in your browser&apos;s toolbar.
              You can close this tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-display-xs font-semibold text-primary">
                Connect the Regibee extension
              </h1>
              <p className="text-sm text-tertiary">
                It brings items from your store registries into the registries you manage on Regibee.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">It can</h2>
                <p className="flex items-start gap-2 text-sm text-primary">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden="true" />
                  Read the items on your {listStores()} registries
                </p>
                <p className="flex items-start gap-2 text-sm text-primary">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden="true" />
                  Read a product page when you click its button, so you can add that item
                </p>
                <p className="flex items-start gap-2 text-sm text-primary">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden="true" />
                  Add those items to your Regibee registries
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">It can&apos;t</h2>
                <p className="flex items-start gap-2 text-sm text-primary">
                  <X className="mt-0.5 size-4 shrink-0 text-tertiary" aria-hidden="true" />
                  See other websites you visit
                </p>
                <p className="flex items-start gap-2 text-sm text-primary">
                  <X className="mt-0.5 size-4 shrink-0 text-tertiary" aria-hidden="true" />
                  Buy, remove or change anything at the stores
                </p>
              </div>
            </div>

            {status === "missing" && (
              <p className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 text-sm text-warning-800" role="alert">
                The Regibee extension isn&apos;t installed in this browser. Install it, then open this page
                from the extension&apos;s button.
              </p>
            )}
            {status === "error" && error && (
              <p className="text-sm text-error-primary" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={onConnect}
                disabled={busy || status === "checking" || status === "missing"}
              >
                {busy ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <p className="max-w-lg text-center text-xs text-tertiary">
        Signed in as {name}. You can disconnect the extension any time from its menu.
      </p>
    </main>
  );
}

// How long to wait for the extension to say hello before saying it's missing.
const DETECT_TIMEOUT_MS = 2000;
// How long to wait for the extension to confirm it saved the session.
const CONNECT_TIMEOUT_MS = 10000;

function postToExtension(message: PageMessage) {
  window.postMessage(message, window.location.origin);
}

/**
 * The Connect page. The extension's content script runs on this page and
 * answers window messages; the session goes to it and nowhere else.
 */
export function ExtensionConnect({ name }: { name: string }) {
  const [status, setStatus] = useState<ConnectStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (!isExtensionMessage(event.data)) return;
      const message = event.data;
      if (message.type === "ready") {
        setStatus((current) => (current === "checking" || current === "missing" ? "ready" : current));
      } else if (message.type === "connected") {
        if (connectTimer.current) clearTimeout(connectTimer.current);
        setStatus("connected");
      } else if (message.type === "connect-failed") {
        if (connectTimer.current) clearTimeout(connectTimer.current);
        setError(message.error);
        setStatus("error");
      }
    }
    window.addEventListener("message", onMessage);
    // The content script also says hello when it loads, in case it loads after this.
    postToExtension({ source: PAGE_SOURCE, type: "hello" });
    const detectTimer = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "missing" : current));
    }, DETECT_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(detectTimer);
      if (connectTimer.current) clearTimeout(connectTimer.current);
    };
  }, []);

  const onConnect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    const result = await connectExtension();
    if (!result.session) {
      setError(result.error ?? "We couldn't connect the extension. Try again.");
      setStatus("error");
      return;
    }
    postToExtension({ source: PAGE_SOURCE, type: "connect", session: result.session });
    connectTimer.current = setTimeout(() => {
      setError("The extension didn't answer. Reload this page and try again.");
      setStatus("error");
    }, CONNECT_TIMEOUT_MS);
  }, []);

  const onCancel = useCallback(() => {
    // The extension closes the tab it opened. Without it, go to the dashboard.
    if (status === "missing" || status === "checking") {
      window.location.assign("/dashboard");
      return;
    }
    postToExtension({ source: PAGE_SOURCE, type: "cancel" });
  }, [status]);

  return <ExtensionConnectCard name={name} status={status} error={error} onConnect={onConnect} onCancel={onCancel} />;
}
