import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      // By default React Query PAUSES changes while offline and sends them by
      // itself when the connection returns — a payment would be registered
      // later without the user knowing (and maybe twice, if they retried).
      // 'always' runs them now, so the API client refuses them with
      // "Sem conexão · nada foi salvo" (improvement 47).
      networkMode: 'always',
    },
  },
})
