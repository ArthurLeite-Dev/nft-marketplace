import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/common/form-field'
import { EthAmount } from '@/components/common/eth-amount'
import { RequireAuth } from '@/components/common/require-auth'
import { useAuth } from '@/app/auth'
import { ApiError } from '@/api/errors'
import { CollectorSchema, type Network, type QuoteResponse, type WalletConnectionResponse, type WalletProvider } from '@/api/contracts/checkout'
import { useCart } from '@/features/cart/useCart'
import { useAccount } from '@/features/account/useAccount'
import { useConnectWallet, useCreateOrder, useCreateQuote, useDisconnectWallet, usePendingOrders } from '@/features/checkout/useCheckout'
import {
  clearAttempt,
  loadAttempt,
  loadCollectorDraft,
  resolveAttempt,
  saveAttempt,
  saveCollectorDraft,
  toCollectorPayload,
  type CheckoutAttempt,
} from '@/features/checkout/attempt'
import { useRealtimeSignal } from '@/realtime/signals'
import { useRealtimeStatus } from '@/realtime/RealtimeProvider'
import { announce } from '@/lib/announce'

export const Route = createFileRoute('/pagamento')({
  component: () => (
    <RequireAuth>
      <CheckoutPage />
    </RequireAuth>
  ),
})

const NETWORKS: Network[] = ['Ethereum', 'Polygon', 'Base']
const PROVIDERS: WalletProvider[] = ['MetaMask', 'WalletConnect', 'Coinbase']

const EMPTY_FORM: Record<string, string> = {
  displayName: '', username: '', email: '', profileName: '', secondaryWallet: '', walletType: '', referralCode: '', ensName: '', note: '',
}

const FIELD_LABELS: Record<string, string> = {
  displayName: 'Nome de exibição', username: 'Usuário', email: 'E-mail', profileName: 'Nome do perfil',
  secondaryWallet: 'Carteira secundária', walletType: 'Tipo de carteira', referralCode: 'Código de indicação', ensName: 'Nome ENS', note: 'Observação',
}

function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id ?? ''
  const realtime = useRealtimeStatus()

  const { data: cart, isPending: cartPending, error: cartError, refetch: refetchCart, acceptPrice } = useCart()
  const { profile } = useAccount()
  const createQuote = useCreateQuote()
  const connectWallet = useConnectWallet()
  const disconnectWallet = useDisconnectWallet()
  const createOrder = useCreateOrder()
  const pendingOrders = usePendingOrders()

  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  const [network, setNetwork] = useState<Network>('Ethereum')
  const [walletSlot, setWalletSlot] = useState<'principal' | 'secundaria'>('principal')
  const [provider, setProvider] = useState<WalletProvider>('MetaMask')
  const [connection, setConnection] = useState<WalletConnectionResponse | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [orderError, setOrderError] = useState<{ message: string; retryable: boolean } | null>(null)
  const submittingRef = useRef(false)
  const hadQuote = useRef(false)

  // ---- Rascunho do colecionador: preenchido a partir do perfil e guardado por usuário ----
  useEffect(() => {
    if (!userId) return
    const draft = loadCollectorDraft(sessionStorage, userId)
    if (draft) {
      setForm({ ...EMPTY_FORM, ...draft })
      return
    }
    if (profile) {
      const main = profile.wallets.principal
      const second = profile.wallets.secundaria
      setForm({
        ...EMPTY_FORM,
        displayName: main?.displayName ?? profile.username,
        username: profile.username,
        email: profile.email,
        profileName: main?.profileName ?? '',
        secondaryWallet: second?.address ?? '',
        walletType: main?.walletType ?? '',
        referralCode: main?.referralCode ?? '',
        ensName: main?.ensName ?? profile.ensName ?? '',
      })
      if (main?.network === 'Polygon' || main?.network === 'Base' || main?.network === 'Ethereum') setNetwork(main.network)
    }
  }, [userId, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId) saveCollectorDraft(sessionStorage, userId, form)
  }, [form, userId])

  const setField = (name: string, value: string) => {
    setForm((f) => ({ ...f, [name]: value }))
    setServerFields((e) => (e[`collector.${name}`] ? { ...e, [`collector.${name}`]: '' } : e))
  }

  const collectorResult = useMemo(() => CollectorSchema.safeParse(toCollectorPayload(form)), [form])
  const clientErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    if (!collectorResult.success) for (const issue of collectorResult.error.issues) errors[String(issue.path[0])] ??= issue.message
    return errors
  }, [collectorResult])
  const errorFor = (name: string) => {
    const show = submitAttempted || touched[name]
    return (show ? clientErrors[name] : undefined) ?? serverFields[`collector.${name}`] ?? undefined
  }

  // ---- Carteiras cadastradas ----
  const wallets = useMemo(
    () =>
      (['principal', 'secundaria'] as const)
        .map((slot) => ({ slot, wallet: profile?.wallets[slot] ?? null }))
        .filter((w): w is { slot: 'principal' | 'secundaria'; wallet: NonNullable<typeof w.wallet> } => Boolean(w.wallet)),
    [profile],
  )
  const selectedWallet = wallets.find((w) => w.slot === walletSlot)?.wallet ?? wallets[0]?.wallet ?? null

  // ---- Itens que exigem atenção (preço alterado / indisponível) ----
  const attention = cart?.lines.filter((l) => l.status !== 'available') ?? []
  const priceChanged = attention.filter((l) => l.status === 'price-changed')
  const unavailable = attention.filter((l) => l.status === 'unavailable')
  const cartSignature = cart ? `${cart.lines.map((l) => `${l.lineId}:${l.quantity}:${l.unitPriceEth}:${l.status}`).join('|')}|${cart.couponCode ?? ''}` : ''
  const quoteKey = cart && cart.lines.length > 0 && attention.length === 0 ? `${network}|${cartSignature}` : null

  // ---- Cotação: sempre do servidor; qualquer mudança de rede/itens/preço a invalida ----
  const { mutate: requestQuote } = createQuote
  useEffect(() => {
    setReviewOpen(false)
    if (!quoteKey) {
      if (hadQuote.current) setNotice('Os valores do pedido mudaram. Revise o resumo e confirme novamente.')
      hadQuote.current = false
      setQuote(null)
      return
    }
    if (hadQuote.current) setNotice('Os valores do pedido mudaram. Revise o resumo e confirme novamente.')
    setQuote(null)
    setQuoteError(null)
    requestQuote(
      { network },
      {
        onSuccess: (q) => {
          hadQuote.current = true
          setQuote(q)
        },
        onError: (e) => {
          hadQuote.current = false
          setQuoteError(e.message)
          if (e instanceof ApiError && (e.code === 'QUOTE_CHANGED' || e.code === 'AVAILABILITY_CONFLICT')) void refetchCart()
        },
      },
    )
  }, [quoteKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // A conexão vale para uma rede: trocar de rede exige conectar de novo.
  useEffect(() => {
    if (connection && connection.network !== network) setConnection(null)
  }, [network, connection])

  // Carteira desconectada (evento Socket.IO): o pedido não pode ser enviado.
  useRealtimeSignal((signal) => {
    if (signal.type === 'wallet-disconnected' && connection?.connectionId === signal.connectionId) {
      setConnection(null)
      setReviewOpen(false)
      setWalletError('A carteira foi desconectada. Conecte novamente para continuar.')
    }
  })

  const onConnect = () => {
    if (!selectedWallet) return
    setWalletError(null)
    connectWallet.mutate(
      { address: selectedWallet.address, provider, network },
      {
        onSuccess: (c) => {
          setConnection(c)
          announce('Carteira conectada.')
        },
        onError: (e) => setWalletError(e instanceof ApiError && e.code === 'WALLET_REJECTED' ? 'A carteira recusou a conexão. Tente novamente.' : e.message),
      },
    )
  }

  const onDisconnect = () => {
    if (!connection) return
    const id = connection.connectionId
    setConnection(null)
    setReviewOpen(false)
    disconnectWallet.mutate({ connectionId: id })
    announce('Carteira desconectada.')
  }

  // ---- Recuperação: pedido pendente / tentativa interrompida ----
  const pending = pendingOrders.data?.[0]
  const savedAttempt: CheckoutAttempt | null = userId ? loadAttempt(sessionStorage, userId) : null
  useEffect(() => {
    if (pending && savedAttempt) void navigate({ to: '/pedidos/$orderId', params: { orderId: pending.id }, replace: true })
  }, [pending?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const canReview = Boolean(quote && connection && collectorResult.success && attention.length === 0)

  const onReview = () => {
    setSubmitAttempted(true)
    setOrderError(null)
    if (!collectorResult.success) {
      announce('Corrija os campos destacados para continuar.', 'assertive')
      return
    }
    if (!connection) {
      setWalletError('Conecte uma carteira para continuar.')
      return
    }
    if (!quote) return
    setNotice(null)
    setReviewOpen(true)
  }

  const submitOrder = async (attempt: CheckoutAttempt) => {
    if (submittingRef.current) return // clique repetido: ignorado enquanto há envio em andamento
    submittingRef.current = true
    setOrderError(null)
    saveAttempt(sessionStorage, userId, attempt)
    try {
      const { order } = await createOrder.mutateAsync({ idempotencyKey: attempt.key, body: attempt.body })
      clearAttempt(sessionStorage, userId)
      setReviewOpen(false)
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    } catch (e) {
      const api = e instanceof ApiError ? e : null
      if (api?.code === 'VALIDATION_ERROR' && api.fields) {
        setServerFields(api.fields)
        setReviewOpen(false)
        clearAttempt(sessionStorage, userId)
      } else if (api && ['QUOTE_CHANGED', 'QUOTE_EXPIRED', 'AVAILABILITY_CONFLICT'].includes(api.code)) {
        // Preço, disponibilidade, cupom ou taxa mudaram: nova cotação e NOVA confirmação do usuário.
        clearAttempt(sessionStorage, userId)
        setReviewOpen(false)
        setQuote(null)
        hadQuote.current = false
        setNotice(api.message)
        void refetchCart()
        requestQuote({ network }, { onSuccess: (q) => { hadQuote.current = true; setQuote(q) }, onError: (err) => setQuoteError(err.message) })
      } else if (api?.code === 'WALLET_DISCONNECTED') {
        clearAttempt(sessionStorage, userId)
        setConnection(null)
        setReviewOpen(false)
        setWalletError(api.message)
      } else if (api?.code === 'IDEMPOTENCY_KEY_REUSED') {
        clearAttempt(sessionStorage, userId)
        setOrderError({ message: 'Não foi possível enviar o pedido. Revise os dados e tente de novo.', retryable: false })
      } else {
        // Timeout/queda de conexão: o pedido PODE ter sido criado. Mantemos a mesma chave:
        // reenviar recupera o mesmo pedido, sem criar outro.
        setOrderError({ message: 'Não recebemos a confirmação do servidor. Você pode tentar de novo com segurança: o mesmo pedido será recuperado, sem cobrança duplicada.', retryable: true })
      }
    } finally {
      submittingRef.current = false
    }
  }

  const onConfirm = () => {
    if (!quote || !connection || !collectorResult.success) return
    const body = { quoteId: quote.quoteId, walletConnectionId: connection.connectionId, collector: collectorResult.data }
    void submitOrder(resolveAttempt(loadAttempt(sessionStorage, userId), body, () => crypto.randomUUID()))
  }

  const onResume = () => {
    if (savedAttempt) void submitOrder(savedAttempt)
  }

  // ---- Estados de página ----
  if (cartError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center" role="alert">
        <h1 className="font-mono text-xl font-bold text-destructive">Não foi possível carregar o carrinho</h1>
        <p className="mt-2 text-muted-foreground">{cartError.message}</p>
        <Button className="mt-4" variant="outline" onClick={() => refetchCart()}>Tentar novamente</Button>
      </div>
    )
  }

  if (!cartPending && cart && cart.lines.length === 0 && !pending && !savedAttempt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-mono text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Adicione NFTs ao carrinho para finalizar a compra.</p>
        <Link to="/" className="button mt-6 inline-block">Explorar NFTs</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-foreground">
      <h1 className="mb-6 font-mono text-2xl font-bold sm:text-3xl">Pagamento</h1>

      {realtime === 'disconnected' && (
        <p role="status" className="mb-4 rounded-md border border-border bg-secondary/40 p-3 text-sm">
          Reconectando às atualizações em tempo real… Os valores continuam sendo validados no envio.
        </p>
      )}
      {notice && <p role="status" className="mb-4 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">{notice}</p>}

      {(pending || savedAttempt) && (
        <section role="status" className="mb-6 rounded-md border border-border bg-card p-4 text-sm">
          {pending ? (
            <p>
              Você já tem um pedido aguardando confirmação.{' '}
              <Link to="/pedidos/$orderId" params={{ orderId: pending.id }} className="font-medium text-primary underline">Acompanhar pedido</Link>
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>Há uma tentativa de pedido interrompida. Retome para recuperar o mesmo pedido, sem duplicar a compra.</p>
              <Button size="sm" variant="outline" onClick={onResume} disabled={createOrder.isPending}>Retomar pedido</Button>
            </div>
          )}
        </section>
      )}

      {attention.length > 0 && (
        <section role="alert" className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <h2 className="font-mono font-bold">Revise os itens antes de continuar</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {attention.map((l) => <li key={l.lineId}>{l.name}: {l.statusReason}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {priceChanged.length > 0 && unavailable.length === 0 && (
              <Button size="sm" disabled={acceptPrice.isPending} onClick={() => priceChanged.forEach((l) => acceptPrice.mutate({ lineId: l.lineId }))}>
                Aceitar novos valores
              </Button>
            )}
            <Link to="/carrinho" className="button">Voltar ao carrinho</Link>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section aria-labelledby="sec-colecionador" className="rounded-lg border border-border bg-card p-5">
            <h2 id="sec-colecionador" className="mb-4 font-mono text-lg font-bold">Dados do colecionador</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['displayName', 'username', 'email', 'profileName'] as const).map((name) => (
                <FormField key={name} id={`collector-${name}`} label={FIELD_LABELS[name]!} required={name !== 'profileName'} error={errorFor(name)}>
                  <Input type={name === 'email' ? 'email' : 'text'} value={form[name] ?? ''} onChange={(e) => setField(name, e.target.value)} onBlur={() => setTouched((t) => ({ ...t, [name]: true }))} />
                </FormField>
              ))}
              <FormField id="collector-secondaryWallet" label={FIELD_LABELS.secondaryWallet!} error={errorFor('secondaryWallet')} hint="Opcional. Endereço 0x…">
                <Input value={form.secondaryWallet ?? ''} onChange={(e) => setField('secondaryWallet', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, secondaryWallet: true }))} />
              </FormField>
              <FormField id="collector-walletType" label={FIELD_LABELS.walletType!} error={errorFor('walletType')}>
                <Input value={form.walletType ?? ''} onChange={(e) => setField('walletType', e.target.value)} />
              </FormField>
              <FormField id="collector-referralCode" label={FIELD_LABELS.referralCode!} error={errorFor('referralCode')}>
                <Input value={form.referralCode ?? ''} onChange={(e) => setField('referralCode', e.target.value)} />
              </FormField>
              <FormField id="collector-ensName" label={FIELD_LABELS.ensName!} error={errorFor('ensName')}>
                <Input value={form.ensName ?? ''} onChange={(e) => setField('ensName', e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="collector-note" label={FIELD_LABELS.note!} error={errorFor('note')} hint="Até 280 caracteres">
                  <Input value={form.note ?? ''} onChange={(e) => setField('note', e.target.value)} />
                </FormField>
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-carteira" className="rounded-lg border border-border bg-card p-5">
            <h2 id="sec-carteira" className="mb-4 font-mono text-lg font-bold">Carteira e rede</h2>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="network" className="mb-1 block text-sm font-mono">Rede</label>
                <select id="network" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={network} onChange={(e) => setNetwork(e.target.value as Network)}>
                  {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="provider" className="mb-1 block text-sm font-mono">Carteira</label>
                <select id="provider" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={provider} onChange={(e) => setProvider(e.target.value as WalletProvider)} disabled={!!connection}>
                  {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Você ainda não cadastrou carteiras. <Link to="/conta/carteiras" className="text-primary underline">Cadastrar carteira</Link>
              </p>
            ) : (
              <fieldset className="space-y-2" disabled={!!connection}>
                <legend className="mb-2 text-sm font-mono">Carteiras cadastradas</legend>
                {wallets.map(({ slot, wallet }) => (
                  <label key={slot} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm">
                    <input type="radio" name="wallet-slot" className="mt-1" checked={(selectedWallet?.address ?? '') === wallet.address} onChange={() => setWalletSlot(slot)} />
                    <span>
                      <span className="block font-medium">{slot === 'principal' ? 'Principal' : 'Secundária'}{wallet.nickname ? ` — ${wallet.nickname}` : ''}</span>
                      <span className="block break-all font-mono text-xs text-muted-foreground">{wallet.address}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {connection ? (
                <>
                  <p role="status" className="text-sm">
                    Conectada via {connection.provider} na rede {connection.network}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={onDisconnect}>Desconectar</Button>
                </>
              ) : (
                <Button type="button" onClick={onConnect} disabled={!selectedWallet || connectWallet.isPending}>
                  {connectWallet.isPending ? 'Conectando…' : 'Conectar carteira'}
                </Button>
              )}
            </div>
            {walletError && <p role="alert" className="mt-3 text-sm text-destructive">{walletError}</p>}
          </section>
        </div>

        <aside aria-labelledby="sec-resumo" className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 id="sec-resumo" className="mb-4 font-mono text-lg font-bold">Resumo do pedido</h2>
          {cartPending || (!quote && !quoteError && attention.length === 0) ? (
            <div className="space-y-3" aria-busy="true" aria-label="Calculando totais">
              <Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-8 w-full" />
            </div>
          ) : quote ? (
            <>
              <ul className="space-y-2 text-sm">
                {quote.lines.map((l) => (
                  <li key={l.lineId} className="flex justify-between gap-2">
                    <span>{l.name} <span className="text-muted-foreground">({l.editionLabel}) × {l.quantity}</span></span>
                    <EthAmount amount={l.subtotalEth} />
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd><EthAmount amount={quote.totals.subtotalEth} /></dd></div>
                <div className="flex justify-between"><dt>Desconto{quote.couponCode ? ` (${quote.couponCode})` : ''}</dt><dd><EthAmount amount={quote.totals.discountEth} /></dd></div>
                <div className="flex justify-between"><dt>Taxa de rede ({quote.network})</dt><dd><EthAmount amount={quote.totals.networkFeeEth} /></dd></div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd><EthAmount amount={quote.totals.totalEth} /></dd></div>
              </dl>
            </>
          ) : quoteError ? (
            <p role="alert" className="text-sm text-destructive">{quoteError}</p>
          ) : null}

          <Button className="mt-5 w-full" onClick={onReview} disabled={!canReview && (!quote || attention.length > 0)}>
            Revisar pedido
          </Button>
          {!connection && quote && <p className="mt-2 text-xs text-muted-foreground">Conecte uma carteira para continuar.</p>}
        </aside>
      </div>

      <Dialog open={reviewOpen} onOpenChange={(open) => { if (!createOrder.isPending) setReviewOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revise e confirme seu pedido</DialogTitle>
            <DialogDescription>Confira os valores. Eles foram cotados agora e serão validados novamente no envio.</DialogDescription>
          </DialogHeader>
          {quote && connection && (
            <div className="space-y-3 text-sm">
              <ul className="space-y-1">
                {quote.lines.map((l) => <li key={l.lineId} className="flex justify-between"><span>{l.name} × {l.quantity}</span><EthAmount amount={l.subtotalEth} /></li>)}
              </ul>
              <p className="flex justify-between border-t border-border pt-2 font-bold"><span>Total</span><EthAmount amount={quote.totals.totalEth} /></p>
              <p className="text-muted-foreground">Rede {quote.network} · {connection.provider} · <span className="break-all font-mono text-xs">{connection.address}</span></p>
              <p className="text-muted-foreground">Colecionador: {form.displayName} ({form.email})</p>
            </div>
          )}
          {orderError && <p role="alert" className="text-sm text-destructive">{orderError.message}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={createOrder.isPending}>Voltar</Button>
            <Button onClick={onConfirm} disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Enviando…' : orderError?.retryable ? 'Tentar novamente' : 'Confirmar compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
