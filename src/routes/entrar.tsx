import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { useAuth } from '@/app/auth'
import { ApiError } from '@/api/errors'
import { LoginInputSchema } from '@/api/contracts/auth'
import { getSafeRedirect } from '@/lib/safe-redirect'
import { announce } from '@/lib/announce'

export const Route = createFileRoute('/entrar')({
  validateSearch: (raw: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof raw.redirect === 'string' ? raw.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { login, isAuthenticated, isLoading, sessionExpired } = useAuth()
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const target = getSafeRedirect(redirect)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Já autenticado (ou login concluído): volta ao fluxo anterior. Feito em efeito, nunca durante a renderização.
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.history.replace(target)
  }, [isLoading, isAuthenticated, target, router])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setFormError(null)
    const parsed = LoginInputSchema.safeParse({ email, password })
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await login(parsed.data)
      announce('Login realizado com sucesso.')
    } catch (error) {
      const api = error instanceof ApiError ? error : null
      if (api?.fields) setFieldErrors(api.fields)
      setFormError(
        api?.code === 'INVALID_CREDENTIALS'
          ? 'E-mail ou senha incorretos.'
          : (api?.message ?? 'Não foi possível entrar. Tente novamente.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 sm:p-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Entrar</h1>
        <p className="mb-6 text-sm text-muted-foreground">Acesse sua conta de colecionador.</p>

        {sessionExpired && !isAuthenticated && (
          <p role="status" className="mb-4 rounded-md border border-border bg-secondary/40 p-3 text-sm">
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        )}
        {formError && (
          <p role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="login-email" label="E-mail" required error={fieldErrors.email}>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField id="login-password" label="Senha" required error={fieldErrors.password}>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
