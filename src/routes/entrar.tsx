import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/entrar')({
  component: LoginRouteComponent,
})

function LoginRouteComponent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">Entrar</h1>
      <p className="text-muted-foreground">Em construção.</p>
    </div>
  )
}
