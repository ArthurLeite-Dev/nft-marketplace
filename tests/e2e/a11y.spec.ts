import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { addToCart, checkoutUntilReview, loginAndWait, openApp } from './helpers'

const serious = (violations: { impact?: string | null }[]) => violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')

test.describe('Acessibilidade', () => {
  for (const [name, path] of [
    ['início', '/'],
    ['detalhe do NFT', '/nft/nft_07'],
    ['login', '/entrar'],
    ['cadastro', '/cadastro'],
    ['carrinho', '/carrinho'],
  ] as const) {
    test(`sem violações sérias/críticas (axe): ${name}`, async ({ page }) => {
      await openApp(page, path)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(serious(results.violations), JSON.stringify(results.violations.map((v) => v.id))).toEqual([])
    })
  }

  test('uma única landmark <main> e ids únicos', async ({ page }) => {
    for (const path of ['/', '/entrar', '/cadastro', '/carrinho', '/nft/nft_07']) {
      await openApp(page, path)
      await expect(page.locator('main')).toHaveCount(1)
      await expect(page.locator('#main-content')).toHaveCount(1)
    }
  })

  test('navegação por teclado: link de pular conteúdo é o primeiro foco e leva ao conteúdo', async ({ page }) => {
    await openApp(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: /pular para o conteúdo/i })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main-content/)
  })

  test('foco visível nos controles interativos', async ({ page }) => {
    await openApp(page, '/entrar')
    await page.getByLabel('E-mail').focus()
    const outline = await page.getByLabel('E-mail').evaluate((el) => getComputedStyle(el).outlineStyle + '|' + getComputedStyle(el).boxShadow)
    expect(outline).not.toBe('none|none')
  })

  test('diálogo de revisão: foco preso no diálogo, Esc fecha e devolve o foco', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page)
    await checkoutUntilReview(page)
    const trigger = page.getByRole('button', { name: 'Revisar pedido' })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('mutations e alterações em tempo real são anunciadas em regiões ao vivo', async ({ page }) => {
    await openApp(page, '/nft/nft_07')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByTestId('live-region-polite')).toContainText(/adicionado ao carrinho/i)
  })

  test('movimento reduzido: skeleton sem animação', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await openApp(page, '/', 'slow')
    const skeleton = page.getByLabel('Carregando NFTs').locator('div').first()
    await expect(skeleton).toBeVisible()
    const name = await skeleton.evaluate((el) => getComputedStyle(el, '::after').animationName)
    expect(name === 'none' || name === '').toBe(true)
    await context.close()
  })
})
