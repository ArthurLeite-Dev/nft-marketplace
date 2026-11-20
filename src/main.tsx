import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

async function bootstrap() {
  if (import.meta.env.VITE_API_MOCKING === 'enabled') {
    const { startMocking } = await import('@/mocks/browser')
    await startMocking()
  }

  const { default: App } = await import('@/app/App')

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
