import { createFileRoute, createRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EthAmount } from '@/components/common/eth-amount'
import { Link } from '@tanstack/react-router'
import { announce } from '@/lib/announce'
import { useAuth } from '@/app/auth'
import { useAccount } from '@/features/account/useAccount'
import { isValidUsername, isValidEmail, isValidPassword } from '@/lib/form-validators'

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

export const Route = createFileRoute('/conta')({
  component: ContaPage,
})

function ContaPage() {
  const { user } = useAuth()
  const { isProfileLoading } = useAccount()
  const userName = user?.username ?? ''
  const userEmail = user?.email ?? ''

  if (!user || isProfileLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="h-6 w-48 rounded-xl bg-secondary/40 shimmer" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-mono font-bold">Minha Conta</h1>
        <Link to="/" className="button">Voltar ao catálogo</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/40 flex items-center justify-center font-mono font-bold text-foreground">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-mono font-bold">{userName}</h2>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <nav className="space-y-2">
              <Link to="perfil" className="button w-full text-left py-3">
                Perfil
              </Link>
              <Link to="carteiras" className="button w-full text-left py-3">
                Carteiras
              </Link>
              <Link to="favoritos" className="button w-full text-left py-3">
                Favoritos
              </Link>
            </nav>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export const indexRoute = createRoute({
  path: '/',
  getParentRoute: () => Route,
  component: AccountOverview,
})

function AccountOverview() {
  const { user } = useAuth()
  const userName = user?.username ?? ''
  const userEmail = user?.email ?? ''

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-lg font-bold">Visão geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Nome de usuário</h3>
          <p className="font-mono">{userName}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">E-mail</h3>
          <p className="font-mono">{userEmail}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Status</h3>
          <p className="font-mono">Ativo</p>
        </div>
      </div>
    </div>
  )
}

export const perfilRoute = createRoute({
  path: 'perfil',
  getParentRoute: () => Route,
  component: PerfilPage,
})

function PerfilPage() {
  const { user, logout } = useAuth()
  const { updateProfile, changePassword } = useAccount()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [ensName, setEnsName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!isValidUsername(username)) {
      setError('Usuário inválido')
      return
    }
    if (!isValidEmail(email)) {
      setError('E-mail inválido')
      return
    }
    updateProfile.mutate({ username, email, ensName: ensName || null }, {
      onSuccess: () => {
        setSuccess('Perfil atualizado com sucesso')
      },
      onError: (err: any) => {
        setError(err.message || 'Falha ao atualizar perfil')
      },
    })
  }

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!isValidPassword(newPassword)) {
      setError('Nova senha deve ter pelo menos 8 caracteres, uma letra e um número')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    changePassword.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    })
  }

  return (
    <div className="space-y-8">
      <h2 className="font-mono text-lg font-bold">Perfil</h2>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Editar perfil</h3>
        <form onSubmit={onUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Nome de usuário</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">ENS Name (opcional)</label>
            <Input
              value={ensName}
              onChange={(e) => setEnsName(e.target.value)}
              placeholder="seunome.eth"
              className="h-10"
            />
          </div>
          <Button type="submit" disabled={updateProfile.isPending} className="w-full">
            {updateProfile.isPending ? 'Atualizando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive bg-destructive/10">
          <p className="text-sm text-destructive font-mono">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
          <p className="text-sm text-emerald-600 font-mono">{success}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Alterar senha</h3>
        <form onSubmit={onChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Senha atual</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Nova senha</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Confirmar nova senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10"
            />
          </div>
          <Button type="submit" disabled={changePassword.isPending} className="w-full">
            {changePassword.isPending ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Sair</h3>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            logout()
            announce('Sessão encerrada', 'polite')
          }}
          className="w-full"
        >
          Logout
        </Button>
      </div>
    </div>
  )
}

export const carteirasRoute = createRoute({
  path: 'carteiras',
  getParentRoute: () => Route,
  component: CarteirasPage,
})

function CarteirasPage() {
  const { upsertWallet, isUpdatingWallet } = useAccount()
  const { profile } = useAccount()
  const [slot, setSlot] = useState<'principal' | 'secundaria'>('principal')
  const [nickname, setNickname] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [network, setNetwork] = useState<'Ethereum' | 'Polygon' | 'Base'>('Ethereum')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  const userWithWallets = profile as { wallets?: { principal?: { nickname: string; displayName: string; network: string; address: string } | null; secundaria?: { nickname: string; displayName: string; network: string; address: string } | null } } | undefined

  const onUpsertWallet = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!EVM_ADDRESS_REGEX.test(address.trim())) {
      setError('Endereço EVM inválido')
      return
    }
    upsertWallet.mutate({
      slot,
      nickname,
      displayName,
      profileName: nickname,
      network,
      address,
      walletType: 'MetaMask',
      referralCode: null,
      email: null,
      ensName: null,
    })
  }

  return (
    <div className="space-y-8">
      <h2 className="font-mono text-lg font-bold">Carteiras</h2>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Adicionar carteira</h3>
        <form onSubmit={onUpsertWallet} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-mono text-foreground">Slot</label>
              <Button
                type="button"
                variant={slot === 'principal' ? 'default' : 'outline'}
                onClick={() => setSlot('principal')}
                className="w-full text-left"
              >
                Principal
              </Button>
              <Button
                type="button"
                variant={slot === 'secundaria' ? 'default' : 'outline'}
                onClick={() => setSlot('secundaria')}
                className="w-full text-left"
              >
                Secundária
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-mono text-foreground">Apelido</label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Nome de exibição</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Rede</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as 'Ethereum' | 'Polygon' | 'Base')}
              className="h-10 text-sm border border-input bg-background rounded-md"
            >
              <option value="Ethereum">Ethereum</option>
              <option value="Polygon">Polygon</option>
              <option value="Base">Base</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-foreground">Endereço</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="h-10"
            />
          </div>
          <Button type="submit" disabled={isUpdatingWallet} className="w-full">
            {isUpdatingWallet ? 'Salvando…' : 'Salvar carteira'}
          </Button>
        </form>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive bg-destructive/10">
          <p className="text-sm text-destructive font-mono">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Carteiras cadastradas</h3>
        <div className="space-y-3">
          {userWithWallets?.wallets?.principal ? (
            <div className="p-3 rounded-lg border border-border bg-secondary/40">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono font-bold">Principal</span>
                <span className="text-xs text-muted-foreground">{userWithWallets.wallets.principal.network}</span>
              </div>
              <p className="text-xs text-muted-foreground">{userWithWallets.wallets.principal.nickname}</p>
              <p className="text-xs font-mono text-muted-foreground break-all">{userWithWallets.wallets.principal.address}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma carteira principal cadastrada.</p>
          )}
          {userWithWallets?.wallets?.secundaria ? (
            <div className="p-3 rounded-lg border border-border bg-secondary/40">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono font-bold">Secundária</span>
                <span className="text-xs text-muted-foreground">{userWithWallets.wallets.secundaria.network}</span>
              </div>
              <p className="text-xs text-muted-foreground">{userWithWallets.wallets.secundaria.nickname}</p>
              <p className="text-xs font-mono text-muted-foreground break-all">{userWithWallets.wallets.secundaria.address}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma carteira secundária cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const favoritosRoute = createRoute({
  path: 'favoritos',
  getParentRoute: () => Route,
  component: FavoritosPage,
})

function FavoritosPage() {
  const { favorites, isFavoritesLoading, toggleFavorite, isTogglingFavorite } = useAccount()

  return (
    <div className="space-y-8">
      <h2 className="font-mono text-lg font-bold">Favoritos</h2>
      <p className="text-muted-foreground">
        Gerencie seus NFTs favoritos aqui.
      </p>

      {isFavoritesLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 rounded-xl bg-secondary/40 shimmer" />
          <div className="h-4 w-24 rounded-xl bg-secondary/40 shimmer" />
        </div>
      )}

      {!isFavoritesLoading && favorites.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground">Você ainda não tem NFTs favoritos.</p>
          <Link to="/" className="button mt-4">Explorar NFTs</Link>
        </div>
      )}

      {!isFavoritesLoading && favorites.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((item) => (
              <Link
                key={item.id}
                to="/nft/$nftId"
                params={{ nftId: item.id }}
                className="block"
              >
                <article className="rounded-lg border border-border bg-card p-3">
                  <div className="aspect-square overflow-hidden rounded-md mb-2 bg-secondary/40">
                    <img
                      src={`/images/nfts/nft${((parseInt(item.id.replace('nft_', '')) - 1) % 4) + 1}.png`}
                      alt={item.name}
                      className="block w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-mono font-bold text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.collection}</p>
                  <div className="mt-1 font-mono font-bold">
                    <EthAmount amount={item.priceEth} showSymbol />
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      const isFav = favorites.some((f) => f.id === item.id)
                      toggleFavorite.mutate({ nftId: item.id, currentlyFavorited: isFav })
                    }}
                    disabled={isTogglingFavorite}
                    className="mt-2 w-full text-xs font-mono text-destructive hover:text-destructive/80"
                  >
                    Remover dos favoritos
                  </button>
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
