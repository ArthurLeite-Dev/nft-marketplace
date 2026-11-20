import { createFileRoute } from '@tanstack/react-router'
import { announce } from '@/lib/announce'

export const Route = createFileRoute('/criadores')({
  component: CriadoresRouteComponent,
})

function CriadoresRouteComponent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">Criadores</h1>
      <p className="text-muted-foreground">
        Este recurso não está disponível nesta demonstração.
      </p>
      <button
        className="button"
        onClick={() => announce('Este recurso não está disponível nesta demonstração.', 'polite')}
      >
        Entendi
      </button>
    </div>
  )
}
