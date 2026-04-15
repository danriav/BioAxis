import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
        networkMode: "offlineFirst",
        refetchOnWindowFocus: false,
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 3,
      },
    },
  });
}
