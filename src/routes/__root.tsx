import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { SkipLink } from '@/components/layout/skip-link'
import { LiveRegion } from '@/components/layout/live-region'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { StatusMessage } from '@/components/common/status-message'
import { useRouteFocus } from '@/app/use-route-focus'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
})

function RootComponent() {
  useRouteFocus()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-[#140d0a]">
      <SkipLink />
      <LiveRegion />
      <Toaster position="top-right" richColors theme="dark" />

      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-hidden"
      >
        <Outlet />
      </main>

      <SiteFooter />
      <MobileTabBar />
    </div>
  )
}

function NotFoundComponent() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <StatusMessage
        icon="error"
        title="404 — Página Não Encontrada"
        description="A página que você tentou acessar não existe ou foi removida."
        action={{
          label: 'Voltar ao Início',
          onClick: () => {
            void navigate({ to: '/' })
          },
        }}
      />
    </div>
  )
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const message = error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao carregar a página.'

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <StatusMessage
        icon="error"
        role="alert"
        title="Ocorreu uma falha"
        description={message}
        action={{
          label: 'Tentar Novamente',
          onClick: reset,
        }}
      />
    </div>
  )
}
