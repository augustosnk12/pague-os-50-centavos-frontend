/** Item 75: "Eu devo", the side of the people you owe (?kind=CREDITOR, API R7). */
import { test, expect } from './support/fixtures'

const iso = (days: number) => {
  const n = new Date()
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() + days)).toISOString()
}

test('Me devem ↔ Eu devo: each side shows only its people, in its words and colour; kept after reload (real API)', async ({ page, session, a11y }, info) => {
  const mobile = info.project.name === 'mobile'
  const ana = await session.api('POST', '/debtors', { name: 'Ana Devedora' })
  await session.api('POST', '/debts', { debtorId: ana.id, type: 'PIX', description: 'Almoço', totalAmount: 50, numberOfInstallments: 1, firstDueDate: iso(3) })
  const mae = await session.api('POST', '/debtors', { name: 'Mãe Credora', kind: 'CREDITOR' })
  await session.api('POST', '/debts', { debtorId: mae.id, type: 'PIX_INSTALLMENT', description: 'Empréstimo do carro', totalAmount: 600, numberOfInstallments: 3, firstDueDate: iso(-2) })

  await page.goto('/debtors')
  await expect(page.getByRole('link', { name: /^Ana Devedora/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Mãe Credora/ })).toHaveCount(0)

  // Switch: the pill on phones, the tabs in the top bar on computers.
  if (mobile) {
    await page.getByRole('button', { name: 'Lado: Me devem. Trocar' }).click()
    await page.getByRole('dialog', { name: 'Ver qual lado?' }).getByRole('radio', { name: /Eu devo/ }).click()
  } else {
    await page.getByRole('banner').getByRole('radio', { name: 'Eu devo' }).click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Credores' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Mãe Credora/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Ana Devedora/ })).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-side', 'out')
  await a11y('side-out-debtors')

  // A person added here is a creditor.
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Novo credor' })
  await form.getByRole('textbox', { name: /Nome/ }).fill('Rafa Credor')
  await form.getByRole('button', { name: /Salvar credor/ }).click()
  await expect(page.getByRole('link', { name: /^Rafa Credor/ })).toBeVisible()

  // Same name as someone of the other side: refused (until R10) and said in Portuguese.
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await form.getByRole('textbox', { name: /Nome/ }).fill('Ana Devedora')
  await form.getByRole('button', { name: /Salvar credor/ }).click()
  await expect(page.getByText(/^Esse nome já está no outro lado \(Me devem \/ Eu devo\)/).first()).toBeVisible()
  await expect(page.getByText('Name already used on the other side')).toHaveCount(0)
  await page.keyboard.press('Escape')
  const creditors = await session.api('GET', '/debtors?kind=CREDITOR')
  expect(creditors.map((d: { name: string }) => d.name).sort()).toEqual(['Mãe Credora', 'Rafa Credor'])

  // Profile: no "Cobrar".
  await page.getByRole('link', { name: /^Mãe Credora/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Mãe Credora/ })).toBeVisible()
  await expect(page.getByText(/Você deve\s*R\$\s600,00/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Cobrar/ })).toHaveCount(0)

  // Painel and Parcelas of this side, kept after a reload.
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 2, name: /^A pagar em / })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: /^A pagar em / })).toBeVisible()
  await a11y('side-out-dashboard')
  await page.goto('/installments?aba=atrasadas')
  await expect(page.getByText('Empréstimo do carro').first()).toBeVisible()
  await expect(page.getByText('Almoço')).toHaveCount(0)

  // Back to "Me devem".
  if (mobile) {
    await page.getByRole('button', { name: 'Lado: Eu devo. Trocar' }).click()
    await page.getByRole('dialog', { name: 'Ver qual lado?' }).getByRole('radio', { name: /Me devem/ }).click()
  } else {
    await page.getByRole('banner').getByRole('radio', { name: 'Me devem' }).click()
  }
  await page.goto('/debtors')
  await expect(page.getByRole('heading', { level: 1, name: 'Devedores' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Ana Devedora/ })).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-side', 'out')
})

test('"Eu devo" in the dark theme passes the same accessibility checks', async ({ page, session, a11y }) => {
  const mae = await session.api('POST', '/debtors', { name: 'Mãe Escuro', kind: 'CREDITOR' })
  await session.api('POST', '/debts', { debtorId: mae.id, type: 'PIX', description: 'Mercado', totalAmount: 80, numberOfInstallments: 1, firstDueDate: iso(-1) })
  await page.addInitScript(() => {
    localStorage.setItem('lt-theme', 'dark')
    localStorage.setItem('pague50_side', 'out')
  })
  await page.goto('/dashboard')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-side', 'out')
  await a11y('dark-side-out-dashboard')
  await page.goto('/debtors')
  await expect(page.getByText('Mãe Escuro')).toBeVisible()
  await a11y('dark-side-out-debtors')
  await page.goto('/debts/new')
  await expect(page.getByText('Para quem você deve?')).toBeVisible()
  await a11y('dark-side-out-new')
})
