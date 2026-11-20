import { test, expect } from '@playwright/test'
import { ANA, loginAndWait } from './helpers'

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHuWc5QAAAABJRU5ErkJggg==', 'base64')

test.describe('Perfil, avatar, senha e carteiras', () => {
  test('editar perfil persiste após refresh', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/conta/perfil')
    await page.getByLabel('Nome de usuário').fill('ana_renomeada')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('status').filter({ hasText: /atualizado/i })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana_renomeada')
  })

  test('erro de validação no perfil não envia', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/conta/perfil')
    await page.getByLabel('E-mail').fill('invalido')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('alert').filter({ hasText: /inválido/i })).toBeVisible()
  })

  test('alterar senha: senha atual errada mostra erro da API; senha válida troca e permite novo login', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/conta/perfil')
    await page.getByLabel('Senha atual').fill('errada@123')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123')
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha123')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await page.getByLabel('Senha atual').fill(ANA.password)
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123')
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha123')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByRole('status').filter({ hasText: /Senha alterada/ })).toBeVisible()
  })

  test('avatar: envia imagem válida, recusa tipo inválido e remove', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/conta/perfil')
    await page.getByLabel('Enviar nova imagem').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1X1 })
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
    await page.getByRole('button', { name: 'Remover avatar' }).click()
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toHaveCount(0)

    await page.getByLabel('Enviar nova imagem').setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByRole('alert').filter({ hasText: /PNG, JPEG ou WebP/ })).toBeVisible()
  })

  test('carteiras: endereço inválido é recusado; carteira válida é salva e persiste', async ({ page }) => {
    await loginAndWait(page)
    await page.goto('/conta/carteiras')
    await page.getByLabel('Endereço').fill('0x123')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByRole('alert').filter({ hasText: /inválido/i })).toBeVisible()

    await page.getByLabel('Apelido').fill('Cofre')
    await page.getByLabel('Nome de exibição').fill('Cofre da Ana')
    await page.getByLabel('Endereço').fill('0x71C84517C3743301AE53675C7FB78B2CE7756CF4')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByRole('status').filter({ hasText: /salva/i })).toBeVisible()
    await page.reload()
    await expect(page.getByText('0x71C84517C3743301AE53675C7FB78B2CE7756CF4').first()).toBeVisible()
  })
})
