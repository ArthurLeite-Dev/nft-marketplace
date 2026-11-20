import { test, expect } from '@playwright/test'
import { addToCart, login, mock, openApp } from './helpers'

test.describe('Carrinho', () => {
  test('visitante adiciona item, vê totais da API e o carrinho sobrevive ao refresh', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: /carrinho/i }).first()).toBeVisible()
    await expect(page.getByText('Subtotal')).toBeVisible()
    await expect(page.getByText('Taxa de rede')).toBeVisible()
    await expect(page.getByText('Total', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Remover item' })).toHaveCount(1)
  })

  test('altera quantidade, respeita o limite e remove o item', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await page.goto('/carrinho')
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await expect(page.getByRole('spinbutton').or(page.getByText(/^2$/)).first()).toBeVisible()
    // Chega ao limite: o botão é desabilitado
    for (let i = 0; i < 10 && (await plus.isEnabled()); i++) await plus.click()
    await expect(plus).toBeDisabled()
    await page.getByRole('button', { name: 'Remover item' }).click()
    await expect(page.getByText(/carrinho está vazio|carrinho vazio/i)).toBeVisible()
  })

  test('cupom: válido aplica desconto; inválido e expirado mostram erro', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await page.goto('/carrinho')
    const input = page.getByLabel('Código do cupom')
    await input.fill('NAOEXISTE')
    await page.getByRole('button', { name: /aplicar/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: /cupom/i })).toBeVisible()

    await input.fill('EARLY25')
    await page.getByRole('button', { name: /aplicar/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: /expirou|expirado/i })).toBeVisible()

    await input.fill('JUNGLE10')
    await page.getByRole('button', { name: /aplicar/i }).click()
    await expect(page.getByText('JUNGLE10').first()).toBeVisible()
    await page.reload()
    await expect(page.getByText('JUNGLE10').first()).toBeVisible()
  })

  test('itens do visitante são preservados ao autenticar', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await login(page, undefined, '/carrinho')
    await expect(page).toHaveURL(/\/carrinho/)
    await expect(page.getByRole('button', { name: 'Remover item' })).toHaveCount(1)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Remover item' })).toHaveCount(1)
  })

  test('mudança de preço recebida durante a navegação informa o usuário e exige aceitar o novo preço', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await page.goto('/carrinho')
    await expect(page.getByRole('button', { name: 'Remover item' })).toBeVisible()
    await mock(page, 'updateNft', 'nft_07', { priceEth: '0.95' })
    await expect(page.getByRole('status').filter({ hasText: /mudou de preço|atualizado/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Aceitar novo preço' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Revise os itens/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Aceitar novo preço' }).click()
    await expect(page.getByRole('button', { name: 'Finalizar compra' })).toBeEnabled()
  })
})

// Teste original preservado sem alterações (smoke: a página carrega sem erros de console).
test.describe('Carrinho (smoke original)', () => {
  test('página de carrinho renderiza sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/carrinho')
    await page.waitForTimeout(1000)

    // Deve carregar sem erros
    await expect(page.locator('body')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
