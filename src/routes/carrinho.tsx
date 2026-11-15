import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/carrinho')({
  component: CartRouteComponent,
})

function CartRouteComponent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">Carrinho</h1>
      <p className="text-muted-foreground">Em construção.</p>
    </div>
  )
}
