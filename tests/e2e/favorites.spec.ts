import { test, expect } from '@playwright/test'
import { loginAndWait, mock } from './helpers'

test.describe('Favoritos (atualização otimista com rollback)', () => {
  test('visitante que tenta favoritar é levado ao login e volta ao NFT', async ({ page }) => {
    await page.goto('/nft/nft_05')
    await page.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fnft%2Fnft_05/)
  })

  test('favoritar persiste após refresh e desfavoritar remove', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/nft/nft_05')
    const button = page.getByRole('button', { name: /Favoritar|Favoritado/ })
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: /Favoritar|Favoritado/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: /Favoritado/ }).click()
    await expect(page.getByRole('button', { name: /Favoritar|Favoritado/ })).toHaveAttribute('aria-pressed', 'false')
  })

  test('falha na mutation desfaz a mudança otimista e avisa o usuário', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/nft/nft_05')
    const button = page.getByRole('button', { name: /Favoritar|Favoritado/ })
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await mock(page, 'setScenario', 'server-error')
    await button.click()
    // Rollback: volta ao estado anterior e o aviso é anunciado na região ao vivo.
    await expect(button).toHaveAttribute('aria-pressed', 'false', { timeout: 20_000 })
    await expect(page.getByTestId('live-region-assertive')).toContainText(/desfeita/i, { timeout: 20_000 })

    // Recuperação: com a API saudável a mesma ação funciona.
    await mock(page, 'setScenario', 'default')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  })
})
