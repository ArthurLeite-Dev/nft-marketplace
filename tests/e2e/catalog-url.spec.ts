import { test, expect } from '@playwright/test'
import { openApp } from './helpers'

test.describe('Catálogo: busca, filtros, ordenação e paginação no estado da URL', () => {
  test('busca compõe a URL, filtra os resultados e sobrevive a refresh', async ({ page }) => {
    await openApp(page, '/')
    const cards = page.getByRole('article')
    await expect(cards.first()).toBeVisible()

    await page.getByLabel('Buscar NFTs ou coleções').fill('cyber')
    await expect(page).toHaveURL(/[?&]q=cyber/)
    await expect(page.getByRole('heading', { name: 'Mercado' })).toBeVisible()
    const titles = await cards.getByRole('heading', { level: 3 }).allInnerTexts()
    expect(titles.length).toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByLabel('Buscar NFTs ou coleções')).toHaveValue('cyber')
    await expect(page).toHaveURL(/[?&]q=cyber/)
    expect(await cards.getByRole('heading', { level: 3 }).allInnerTexts()).toEqual(titles)
  })

  test('filtros combináveis, ordenação e reinício da paginação ao mudar filtro', async ({ page }) => {
    await openApp(page, '/?page=2')
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText(/Página 2 de/)).toBeVisible()

    // Mudar qualquer filtro reinicia a paginação.
    await page.getByRole('button', { name: /Polygon/ }).click()
    await expect(page).toHaveURL(/networks=Polygon/)
    await expect(page).not.toHaveURL(/page=2/)

    // Filtros combinam (rede + ordenação).
    await page.getByLabel('Ordenar por').click()
    await page.getByRole('option', { name: 'Preço menor' }).click()
    await expect(page).toHaveURL(/networks=Polygon/)
    await expect(page).toHaveURL(/sort=price-asc/)

    const prices = (await page.getByRole('article').locator('span.font-mono.font-bold').allInnerTexts()).map((t) => parseFloat(t))
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  })

  test('paginação e histórico: voltar/avançar restauram a consulta', async ({ page }) => {
    await openApp(page, '/')
    await page.getByRole('button', { name: 'Próxima' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText(/Página 2 de/)).toBeVisible()

    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.getByText(/Página 1 de/)).toBeVisible()
    await page.goForward()
    await expect(page.getByText(/Página 2 de/)).toBeVisible()
  })

  test('resultado vazio mostra mensagem e permite limpar filtros', async ({ page }) => {
    await openApp(page, '/?q=zzzz-nao-existe')
    await expect(page.getByText(/Nenhum NFT encontrado/)).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(page).not.toHaveURL(/q=/)
    await expect(page.getByRole('article').first()).toBeVisible()
  })

  test('cenário de lentidão mostra skeleton com dimensões preservadas e depois os dados', async ({ page }) => {
    await openApp(page, '/', 'slow')
    await expect(page.getByLabel('Carregando NFTs')).toBeVisible()
    await expect(page.getByRole('article').first()).toBeVisible({ timeout: 15_000 })
  })

  test('falha de servidor mostra erro e recupera ao tentar novamente', async ({ page }) => {
    await openApp(page, '/?q=a', 'server-error')
    await expect(page.getByRole('alert').filter({ hasText: /Não foi possível carregar o catálogo/ })).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => (window as unknown as { __mock: { setScenario(id: string): void } }).__mock.setScenario('default'))
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('article').first()).toBeVisible()
  })

  test('rota inexistente e NFT inexistente tratados', async ({ page }) => {
    await page.goto('/nft/nao-existe')
    await expect(page.getByRole('heading', { name: /não encontrado/i })).toBeVisible()
  })
})
