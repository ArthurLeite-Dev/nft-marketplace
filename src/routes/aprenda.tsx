import { createFileRoute } from '@tanstack/react-router'
import { announce } from '@/lib/announce'

export const Route = createFileRoute('/aprenda')({
  component: AprendaRouteComponent,
})

function AprendaRouteComponent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">Aprenda</h1>
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
