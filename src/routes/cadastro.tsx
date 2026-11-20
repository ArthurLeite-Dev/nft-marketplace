import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { useAuth } from '@/app/auth'
import { ApiError } from '@/api/errors'
import { RegisterInputSchema } from '@/api/contracts/auth'
import { getSafeRedirect } from '@/lib/safe-redirect'
import { announce } from '@/lib/announce'

export const Route = createFileRoute('/cadastro')({
  validateSearch: (raw: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof raw.redirect === 'string' ? raw.redirect : undefined,
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const target = getSafeRedirect(redirect)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.history.replace(target)
  }, [isLoading, isAuthenticated, target, router])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setFormError(null)
    const errors: Record<string, string> = {}
    const parsed = RegisterInputSchema.safeParse({ username, email, password })
    if (!parsed.success) for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message
    if (password !== confirm) errors.confirm = 'As senhas não coincidem'
    if (Object.keys(errors).length > 0 || !parsed.success) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await register(parsed.data)
      announce('Conta criada com sucesso.')
    } catch (error) {
      const api = error instanceof ApiError ? error : null
      if (api?.fields) setFieldErrors(api.fields)
      setFormError(
        api?.code === 'EMAIL_TAKEN' || api?.code === 'USERNAME_TAKEN'
          ? 'Já existe uma conta com estes dados.'
          : (api?.message ?? 'Não foi possível criar a conta. Tente novamente.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 sm:p-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Cadastro</h1>
        <p className="mb-6 text-sm text-muted-foreground">Crie sua conta de colecionador para comprar NFTs.</p>

        {formError && (
          <p role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="register-username" label="Nome de usuário" required error={fieldErrors.username} hint="3 a 30 caracteres: letras, números, _ . -">
            <Input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </FormField>
          <FormField id="register-email" label="E-mail" required error={fieldErrors.email}>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField id="register-password" label="Senha" required error={fieldErrors.password} hint="Mínimo de 8 caracteres, com letra e número">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <FormField id="register-confirm" label="Confirmar senha" required error={fieldErrors.confirm}>
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </FormField>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
