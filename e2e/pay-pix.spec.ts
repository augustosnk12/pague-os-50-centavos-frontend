/** Item 75 (W5b): a creditor's Pix key and "Pagar com Pix" on their profile (real API). */
import { test, expect } from './support/fixtures'

const iso = (days: number) => {
  const n = new Date()
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() + days)).toISOString()
}

test('Pagar com Pix: no key → "Adicionar chave Pix" in the form; then key, QR and amounts; "Já paguei" registers the chosen installments', async ({ page, session, a11y }) => {
  await page.addInitScript(() => localStorage.setItem('pague50_side', 'out'))
  const mae = await session.api('POST', '/debtors', { name: 'Mãe Pix', kind: 'CREDITOR' })
  // R$ 600 in 3: the first is late, then the next one, then the rest.
  await session.api('POST', '/debts', { debtorId: mae.id, type: 'PIX_INSTALLMENT', description: 'Carro', totalAmount: 600, numberOfInstallments: 3, firstDueDate: iso(-2) })

  await page.goto(`/debtors/${mae.id}`)
  await expect(page.getByRole('heading', { level: 1, name: /Mãe Pix/ })).toBeVisible()
  await page.getByRole('button', { name: /Pagar com Pix/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Pagar Mãe' })
  await expect(sheet.getByText('Mãe ainda não tem chave Pix cadastrada.')).toBeVisible()
  await expect(sheet.getByRole('img', { name: /QR Code/ })).toHaveCount(0)

  // "Adicionar chave Pix" → the form, with the key field first.
  await sheet.getByRole('button', { name: 'Adicionar chave Pix' }).click()
  const form = page.getByRole('dialog', { name: 'Editar cadastro' })
  await form.getByRole('button', { name: 'Celular' }).click()
  const key = form.getByRole('textbox', { name: /Chave Celular/ })
  await key.pressSequentially('11998887766')
  await expect(key).toHaveValue('(11) 99888-7766')
  await expect(form.getByText('✓ Chave válida')).toBeVisible()
  await form.getByRole('button', { name: /Salvar alterações/ }).click()
  await expect(form).toHaveCount(0)
  const saved = await session.api('GET', `/debtors/${mae.id}`)
  expect({ key: saved.pixKey, type: saved.pixKeyType, kind: saved.kind }).toEqual({ key: '+5511998887766', type: 'PHONE', kind: 'CREDITOR' })

  // Now the sheet has the key, the QR Code and the amounts.
  await page.getByRole('button', { name: /Pagar com Pix/ }).click()
  await expect(sheet.getByText('(11) 99888-7766')).toBeVisible()
  const amounts = sheet.getByRole('radiogroup', { name: 'Quanto pagar' })
  await expect(amounts.getByRole('radio')).toHaveText([/Atrasado\s*R\$\s200,00/, /Próxima\s*R\$\s200,00/, /Tudo\s*R\$\s600,00/])
  await expect(sheet.getByRole('img', { name: /^QR Code Pix de R\$\s200,00 para Mãe Pix$/ })).toBeVisible()
  await expect(sheet.locator('.lt-qr-box svg')).toBeVisible()
  await a11y('pay-pix-sheet')
  await amounts.getByRole('radio', { name: /Tudo/ }).click()
  await expect(sheet.getByRole('img', { name: /^QR Code Pix de R\$\s600,00 para Mãe Pix$/ })).toBeVisible()

  // "Já paguei" for the next one: its payment sheet, with that amount.
  await amounts.getByRole('radio', { name: /Próxima/ }).click()
  await sheet.getByRole('button', { name: /^Já paguei · registrar R\$\s200,00$/ }).click()
  await page.getByRole('button', { name: /^Quitar parcela · R\$\s200,00$/ }).click()
  await expect(page.getByText(/Você deve\s*R\$\s400,00/)).toBeVisible()

  // "Tudo" (still 2 open): "várias de uma vez" with exactly them.
  await page.getByRole('button', { name: /Pagar com Pix/ }).click()
  await amounts.getByRole('radio', { name: /Tudo/ }).click()
  await sheet.getByRole('button', { name: /^Já paguei · registrar R\$\s400,00$/ }).click()
  await page.getByRole('button', { name: /^Registrar R\$\s400,00 em 2 parcelas$/ }).click()
  await expect(page.getByRole('button', { name: /Pagar com Pix/ })).toHaveAttribute('aria-disabled', 'true')
  const left = await session.api('GET', `/debtors/${mae.id}/debts`)
  expect(left[0].installments.every((i: { paidAt: string | null }) => i.paidAt)).toBe(true)
})
