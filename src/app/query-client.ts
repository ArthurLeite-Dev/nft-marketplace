import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false
          if (error instanceof ApiError) {
            return error.retryable
          }
          return false
        },
        retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 4000),
      },
      mutations: {
        retry: false, // mutations never blind retry
      },
    },
  })
}

export const queryClient = createQueryClient()
