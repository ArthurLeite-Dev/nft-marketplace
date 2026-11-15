import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pedidos/$orderId')({
  component: OrderRouteComponent,
})

function OrderRouteComponent() {
  const { orderId } = Route.useParams()
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">Pedido</h1>
      <p className="text-muted-foreground">Pedido {orderId} — em construção.</p>
    </div>
  )
}
