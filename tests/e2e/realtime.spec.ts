import { test, expect } from '@playwright/test'
import { addToCart, checkoutUntilReview, confirmOrder, loginAndWait, mock, openApp } from './helpers'

/**
 * Tempo real. Os eventos nascem no servidor simulado (window.__mock.updateNft, advanceClock...),
 * trafegam pelo transporte WebSocket interceptado pelo MSW (@mswjs/socket.io-binding) e chegam
 * ao app pelo socket.io-client. Nenhum teste altera estado da UI diretamente.
 */
test.describe('Socket.IO: nft.updated e order.updated', () => {
  test('nft.updated atualiza o preço no detalhe sem recarregar', async ({ page }) => {
    await openApp(page, '/nft/nft_07')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await mock(page, 'updateNft', 'nft_07', { editions: { ed_07_2: { priceEth: '0.77' } } })
    await expect(page.getByRole('status').filter({ hasText: /preço deste NFT mudou|atualizados/i })).toBeVisible({ timeout: 15_000 })
  })

  test('nft.updated atualiza o card do catálogo', async ({ page }) => {
    await openApp(page, '/')
    const card = page.getByRole('article').first()
    await expect(card).toBeVisible()
    await mock(page, 'updateNft', 'nft_01', { priceEth: '9.99' })
    await expect(page.getByText('9.99 ETH').first()).toBeVisible({ timeout: 15_000 })
  })

  test('order.updated confirma o pedido pendente sem recarregar a página', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await confirmOrder(page)
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await mock(page, 'advanceClock', 3500)
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 15_000 })
  })

  test('eventos duplicados e antigos não regridem o estado mais recente', async ({ page }) => {
    await openApp(page, '/nft/nft_07', 'duplicate-events')
    await mock(page, 'updateNft', 'nft_07', { editions: { ed_07_2: { priceEth: '0.60' } } })
    await mock(page, 'updateNft', 'nft_07', { editions: { ed_07_2: { priceEth: '0.80' } } })
    // O servidor reenviou duplicatas e a versão anterior depois da nova: o preço final é o mais recente.
    await expect(page.getByText('0.80 ETH').first()).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(1500)
    await expect(page.getByText('0.80 ETH').first()).toBeVisible()
    await expect(page.getByText('0.60 ETH')).toHaveCount(0)
  })

  test('desconexão: eventos perdidos são reconciliados via REST ao reconectar', async ({ page }) => {
    await openApp(page, '/nft/nft_07')
    await mock(page, 'setRealtimeOnline', false)
    await mock(page, 'updateNft', 'nft_07', { editions: { ed_07_2: { priceEth: '0.66' } } }) // evento perdido
    await mock(page, 'setRealtimeOnline', true)
    await expect(page.getByText('0.66 ETH').first()).toBeVisible({ timeout: 20_000 })
  })

  test('wallet.disconnected durante o checkout bloqueia o envio e pede nova conexão', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await mock(page, 'disconnectWallet')
    await expect(page.getByRole('alert').filter({ hasText: /desconectada/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
  })

  test('pedido pendente sobrevive à queda e à retomada da conexão em tempo real', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await confirmOrder(page)
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await mock(page, 'setRealtimeOnline', false)
    await mock(page, 'advanceClock', 3500) // liquida enquanto o tempo real está fora
    await mock(page, 'setRealtimeOnline', true)
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 20_000 })
    const db = await mock<{ orders: unknown[] }>(page, 'snapshot')
    expect(db.orders).toHaveLength(1)
  })

  test('troca de usuário: eventos privados do usuário anterior não chegam ao novo', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await confirmOrder(page)
    const orderUrl = page.url()
    await page.getByRole('button', { name: 'Sair' }).click()
    await openApp(page, '/entrar')
    await page.getByLabel('E-mail').fill('bruno@jungle.test')
    await page.getByLabel('Senha').fill('Galeria@2026')
    await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
    await expect(page).not.toHaveURL(/\/entrar/)
    await mock(page, 'advanceClock', 3500) // liquida o pedido da Ana
    await page.goto(orderUrl)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  })
})
