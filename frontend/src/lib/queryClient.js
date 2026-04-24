import { QueryClient } from '@tanstack/react-query';

// Shared QueryClient. staleTime of 30s avoids hammering the API on rapid remounts;
// retry:1 keeps brief network blips from surfacing as errors in the UI.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
