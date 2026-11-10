// Cached data. The app saves what it last loaded on the phone, so it opens
// straight onto your registries and refreshes them in the background.

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, focusManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { isDemo } from "@/lib/demo";
import { kvStorage } from "@/lib/kv-storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 2,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: kvStorage,
  key: "regibee-cache",
  throttleTime: 1000,
});

// Refresh when the app comes back to the front, like a browser tab does.
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state) => setFocused(state === "active"));
    return () => subscription.remove();
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        buster: "1",
        // The demo lives only in memory.
        dehydrateOptions: { shouldDehydrateQuery: (query) => !isDemo() && defaultShouldDehydrateQuery(query) },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/** Forgets everything cached, for signing out. */
export async function clearCache() {
  queryClient.clear();
  await persister.removeClient();
}
