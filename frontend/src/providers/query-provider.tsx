"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";

import { createQueryClient } from "@/lib/query-client";

type QueryProviderProps = {
  children: React.ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient());
  const persister =
    typeof window === "undefined"
      ? null
      : createSyncStoragePersister({
          storage: window.localStorage,
          key: "HEALTH_APP_CACHE",
          throttleTime: 1000,
        });

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
