/** Item 68: the charge message your way (Amigável · Direta · Minha), saved in the account. */
import { test, expect } from './support/fixtures'

test('Mensagem de cobrança: Minha with variables, saved in the API, used by the WhatsApp sheet; "Mudar em Configurações" comes back (real API)', async ({ page, session, a11y }) => {
  await session.api('PUT', '/settings', { pixKey: '11987654321', pixKeyType: 'PHONE' })
  const d = await session.api('POST', '/debtors', { name: 'Rita Modelo', phone: '11912345678' })
  const n = new Date()
  const due = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() - 3)).toISOString()
  await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Empréstimo', totalAmount: 150, numberOfInstallments: 1, firstDueDate: due })

  await page.goto('/settings')
  const group = page.getByRole('radiogroup', { name: 'Modelo da mensagem' })
  await expect(group.getByRole('radio', { name: 'Amigável' })).toHaveAttribute('aria-checked', 'true')
  // The preview uses someone real (the Painel's first "Atenção").
  const preview = page.getByLabel('Prévia da mensagem para Rita')
  await expect(preview).toContainText('Oi, Rita! Tudo bem?')

  await group.getByRole('radio', { name: 'Minha' }).click()
  const field = page.getByRole('textbox', { name: 'Seu texto' })
  await expect(field).toHaveValue(/\{itens\}/)
  await field.fill('E aí, ! Falta {total}.\n{pix}')
  await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(6, 6))
  await page.getByRole('button', { name: 'Inserir Nome ({nome})' }).click()
  await expect(field).toHaveValue('E aí, {nome}! Falta {total}.\n{pix}')
  await expect(preview).toContainText(/E aí, Rita! Falta R\$\s150,00\.\s*Pix copia e cola/)
  await a11y('charge-message')
  // Saved when leaving the field.
  const saved = page.waitForResponse((r) => r.url().endsWith('/settings') && r.request().method() === 'PUT')
  await page.getByRole('heading', { level: 1, name: 'Configurações' }).click()
  await saved
  const s = await session.api('GET', '/settings')
  expect(s).toMatchObject({ chargeTone: 'CUSTOM', chargeTemplate: 'E aí, {nome}! Falta {total}.\n{pix}' })

  // The WhatsApp sheet uses it; the Pix goes where {pix} is.
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /^Rita Modelo, Empréstimo/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Lembrar Rita no WhatsApp' }).click()
  const sheet = page.getByRole('dialog', { name: 'Lembrar Rita' })
  const text = sheet.getByRole('textbox', { name: 'Mensagem' })
  await expect(text).toHaveValue(/^E aí, Rita! Falta R\$\s150,00\.$/)
  await sheet.getByRole('switch', { name: 'Incluir Pix copia e cola' }).click()
  await expect(text).toHaveValue(/^E aí, Rita! Falta R\$\s150,00\.\nPix copia e cola \(R\$\s150,00\):\n00020126.*5406150\.00/)
  await expect(sheet).toContainText('Modelo: Minha · Mudar em Configurações')
  await sheet.getByRole('button', { name: 'Mudar em Configurações' }).click()
  await expect(page).toHaveURL(/\/settings#mensagem$/)
  await expect(group).toBeInViewport()
})
