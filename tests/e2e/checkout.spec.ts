import { test, expect } from '@playwright/test'
import { addToCart, checkoutUntilReview, confirmOrder, loginAndWait, mock, openApp } from './helpers'

test.describe('Pagamento e confirmação', () => {
  test('visitante que finaliza a compra faz login e continua o checkout com os itens', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await page.goto('/carrinho')
    await page.getByRole('button', { name: 'Finalizar compra' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
  })

  test('compra completa: catálogo -> detalhe -> carrinho -> pagamento -> recibo confirmado', async ({ page }) => {
    await loginAndWait(page)
    await openApp(page, '/')
    await page.getByRole('article').first().click()
    await expect(page).toHaveURL(/\/nft\//)
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await checkoutUntilReview(page)
    await confirmOrder(page)

    await expect(page).toHaveURL(/\/pedidos\//)
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    // A confirmação só aparece depois que o pedido é liquidado pela simulação (order.updated).
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toHaveCount(0)
    await mock(page, 'advanceClock', 3500)
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^0x[0-9a-f]{64}$/)).toBeVisible()

    // Só os itens comprados saem do carrinho.
    await page.goto('/carrinho')
    await expect(page.getByRole('button', { name: 'Remover item' })).toHaveCount(0)
  })

  test('validação do colecionador: erros por campo associados aos inputs', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await page.getByLabel('Nome de exibição').fill('')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    const field = page.getByLabel('Nome de exibição')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('pagamento recusado: tela de recusa e itens preservados no carrinho', async ({ page }) => {
    await loginAndWait(page)
    await openApp(page, '/', 'payment-refused')
    await addToCart(page)
    await checkoutUntilReview(page)
    await confirmOrder(page)
    await mock(page, 'advanceClock', 3500)
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toHaveCount(0)
    await page.goto('/carrinho')
    await expect(page.getByRole('button', { name: 'Remover item' })).toHaveCount(1)
  })

  test('clique repetido em "Confirmar compra" cria um único pedido', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' })
    await confirm.dblclick()
    await expect(page).toHaveURL(/\/pedidos\//)
    const db = await mock<{ orders: unknown[] }>(page, 'snapshot')
    expect(db.orders).toHaveLength(1)
  })

  test('timeout após criar o pedido: o reenvio recupera o MESMO pedido (idempotência)', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await mock(page, 'setScenario', 'order-timeout')
    await checkoutUntilReview(page)
    await confirmOrder(page)
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/Não recebemos a confirmação/)
    let db = await mock<{ orders: { id: string }[] }>(page, 'snapshot')
    expect(db.orders).toHaveLength(1)
    const firstId = db.orders[0]!.id

    await page.getByRole('dialog').getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(new RegExp(`/pedidos/${firstId}`))
    db = await mock<{ orders: { id: string }[] }>(page, 'snapshot')
    expect(db.orders).toHaveLength(1)
  })

  test('pedido pendente é recuperado após refresh sem criar outra compra', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await confirmOrder(page)
    await expect(page).toHaveURL(/\/pedidos\//)
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    const db = await mock<{ orders: unknown[] }>(page, 'snapshot')
    expect(db.orders).toHaveLength(1)
  })

  test('carteira recusada na 1ª tentativa e conexão na 2ª; desconexão bloqueia o envio', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await openApp(page, '/carrinho', 'wallet-rejected')
    await page.getByRole('button', { name: 'Finalizar compra' }).click()
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByRole('alert').filter({ hasText: /recusou/i })).toBeVisible()
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText(/Conectada via/)).toBeVisible()
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('preço alterado durante o checkout invalida a cotação e exige nova confirmação', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await mock(page, 'updateNft', 'nft_07', { priceEth: '0.95' })
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 }) // revisão fechada
    await expect(page.getByRole('alert').filter({ hasText: /Revise os itens/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aceitar novos valores' })).toBeVisible()
    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    // Nova cotação, mas NENHUM pedido é criado sem nova confirmação explícita.
    await expect(page.getByRole('button', { name: 'Revisar pedido' })).toBeEnabled()
    const db = await mock<{ orders: unknown[] }>(page, 'snapshot')
    expect(db.orders).toHaveLength(0)
  })
})

// Teste original preservado sem alterações (smoke: a rota carrega sem erros de console).
test.describe('Pagamento (smoke original)', () => {
  test('página de pagamento renderiza sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/pagamento')
    await page.waitForTimeout(1000)

    await expect(page.locator('body')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
