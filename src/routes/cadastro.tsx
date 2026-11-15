import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/app/auth'
import { isValidEmail, isValidPassword, isValidUsername } from '@/lib/form-validators'

export const Route = createFileRoute('/cadastro')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const { user, register, isLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    navigate({ to: '/' })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isValidUsername(username)) {
      setError('Usuário deve ter 3–30 caracteres (letras, números, _, - e .)')
      return
    }
    if (!isValidEmail(email)) {
      setError('E-mail inválido')
      return
    }
    if (!isValidPassword(password)) {
      setError('Senha deve ter pelo menos 8 caracteres, uma letra e um número')
      return
    }
    register({ username, email, password }).catch((err: any) => {
      setError(err.message || 'Falha ao cadastrar')
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main id="main-content" className="flex-1 px-4 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono font-bold">Cadastro</h1>
          <p className="text-muted-foreground mt-2">
            Crie sua conta para começar a colecionar NFTs.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg border border-destructive bg-destructive/10">
            <p className="text-sm text-destructive font-mono">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Nome de usuário</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ana_colecao"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@jungle.test"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/entrar" className="text-primary font-mono font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </main>
    </div>
  )
}
