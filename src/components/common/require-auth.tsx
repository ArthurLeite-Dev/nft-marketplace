import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/app/auth'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Guarda de rota privada (checkout, pedidos, conta, favoritos).
 * Sem sessão, leva ao login guardando o destino em `?redirect=`, para o usuário voltar ao fluxo
 * anterior depois de autenticar (inclusive após expiração de sessão no meio do checkout).
 * O conteúdo privado nem chega a ser renderizado enquanto não houver sessão válida.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: '/entrar', search: { redirect: location.href } as never, replace: true })
    }
  }, [isLoading, isAuthenticated, location.href, navigate])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12" aria-busy="true" aria-label="Verificando sessão">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }
  return <>{children}</>
}
