import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    context: {
      queryClient,
    },
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
