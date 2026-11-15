import { createFileRoute, createRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/conta')({
  component: ContaRouteComponent,
})

function ContaRouteComponent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-mono font-bold">Minha Conta</h1>
      <p className="text-muted-foreground">Em construção.</p>
    </div>
  )
}

export const indexRoute = createRoute({
  path: '/',
  getParentRoute: () => Route,
  component: () => <div className="text-muted-foreground">Visão geral da conta.</div>,
})

export const perfilRoute = createRoute({
  path: 'perfil',
  getParentRoute: () => Route,
  component: () => <div className="text-muted-foreground">Perfil — em construção.</div>,
})

export const carteirasRoute = createRoute({
  path: 'carteiras',
  getParentRoute: () => Route,
  component: () => <div className="text-muted-foreground">Carteiras — em construção.</div>,
})

export const favoritosRoute = createRoute({
  path: 'favoritos',
  getParentRoute: () => Route,
  component: () => <div className="text-muted-foreground">Favoritos — em construção.</div>,
})
