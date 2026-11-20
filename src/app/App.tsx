import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query-client'
import { createAppRouter } from './router'
import { AuthProvider } from './auth'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

const router = createAppRouter()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
