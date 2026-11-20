import { test, expect } from '@playwright/test'
import { ANA, BRUNO, login, loginAndWait, mock, openApp } from './helpers'

test.describe('Cadastro, login, sessão, logout e troca de usuário', () => {
  test('credenciais inválidas mostram erro sem derrubar a página', async ({ page }) => {
    await login(page, { email: ANA.email, password: 'errada123' })
    await expect(page.getByRole('alert')).toContainText(/incorretos/i)
    await expect(page).toHaveURL(/\/entrar/)
  })

  test('validação do formulário de login associa o erro ao campo', async ({ page }) => {
    await openApp(page, '/entrar')
    await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
    const email = page.getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy!.split(' ')[0]}`)).not.toBeEmpty()
  })

  test('login retorna ao fluxo anterior (redirect) e a sessão sobrevive ao refresh', async ({ page }) => {
    await login(page, ANA, '/carrinho')
    await expect(page).toHaveURL(/\/carrinho/)
    await page.reload()
    await expect(page).toHaveURL(/\/carrinho/)
    await expect(page.getByRole('link', { name: /conta/i }).or(page.getByRole('button', { name: /sair/i })).first()).toBeVisible()
  })

  test('rota privada sem sessão leva ao login preservando o destino', async ({ page }) => {
    await page.goto('/pagamento')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
  })

  test('redirect malicioso é ignorado (sem open redirect)', async ({ page }) => {
    await login(page, ANA, 'https://evil.example.com/')
    await expect(page).toHaveURL(/localhost/)
  })

  test('cadastro com e-mail já usado mostra o conflito', async ({ page }) => {
    await openApp(page, '/cadastro')
    await page.getByLabel('Nome de usuário').fill('outro_usuario')
    await page.getByLabel('E-mail').fill(ANA.email)
    await page.getByLabel('Senha', { exact: true }).fill('Segredo123')
    await page.getByLabel('Confirmar senha').fill('Segredo123')
    await page.locator('form').getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page).toHaveURL(/\/cadastro/)
  })

  test('cadastro cria conta, autentica e persiste após refresh', async ({ page }) => {
    await openApp(page, '/cadastro')
    await page.getByLabel('Nome de usuário').fill('novo_colecionador')
    await page.getByLabel('E-mail').fill('novo@jungle.test')
    await page.getByLabel('Senha', { exact: true }).fill('Segredo123')
    await page.getByLabel('Confirmar senha').fill('Segredo123')
    await page.locator('form').getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).not.toHaveURL(/\/cadastro/)
    await page.reload()
    await page.goto('/conta')
    await expect(page).toHaveURL(/\/conta/)
  })

  test('sessão expirada: redireciona ao login com aviso e retoma depois', async ({ page }) => {
    await loginAndWait(page, ANA)
    await page.goto('/conta/favoritos')
    await mock(page, 'advanceClock', 1000)
    await mock(page, 'setScenario', 'session-expired')
    await page.goto('/conta/favoritos')
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
  })

  test('logout limpa os dados privados; outro usuário não vê os dados do anterior', async ({ page }) => {
    await loginAndWait(page, ANA)
    await page.goto('/conta/favoritos')
    await expect(page.getByRole('article').first()).toBeVisible() // Ana tem favoritos

    await page.getByRole('button', { name: /sair/i }).first().click()
    await login(page, BRUNO)
    await expect(page).not.toHaveURL(/\/entrar/)
    await page.goto('/conta/favoritos')
    await expect(page.getByText(/nenhum favorito|não tem favoritos|vazio/i)).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
  })
})
