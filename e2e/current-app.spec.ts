/**
 * Regression suite for the app as it is today, against the real API and a real
 * PostgreSQL. It must stay green while UI v2 ships: tests are only updated in
 * the same PR that redesigns the screen they cover.
 */
import { test, expect, createLenderWithLoginToken, thisMonthISO } from './support/fixtures'
import { API_URL } from './support/env.mjs'

test('magic link: the API verifies the token and the app lands on the dashboard', async ({ page, a11y }) => {
  const l = createLenderWithLoginToken('Maria Teste')
  await page.goto(`${API_URL}/auth/verify?token=${l.token}`)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1, name: /olá, maria/i })).toBeVisible()
  await a11y('dashboard-empty')
})

test('an already-used magic link is refused', async ({ page }) => {
  const l = createLenderWithLoginToken()
  await page.goto(`${API_URL}/auth/verify?token=${l.token}`)
  await expect(page).toHaveURL(/\/dashboard$/)
  // Leave the app first: with cookies gone it would redirect itself to /login
  // (401 handler) and abort the navigation below.
  await page.goto('about:blank')
  await page.context().clearCookies()
  await page.goto(`${API_URL}/auth/verify?token=${l.token}`)
  await expect(page).toHaveURL(/\/login\?error=/)
})

test('login page', async ({ page, a11y }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1, name: /bem-vindo de volta/i })).toBeVisible()
  await expect(page.getByPlaceholder('voce@email.com')).toBeVisible()
  await a11y('login')
})

test.describe('with data', () => {
  test('debtors list and debtor detail show what the API has', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'João Araújo', phone: '11999990000' })
    await session.api('POST', '/debts', {
      debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Notebook', totalAmount: 600,
      numberOfInstallments: 3, firstDueDate: thisMonthISO(28),
    })

    await page.goto('/debtors')
    await expect(page.getByRole('heading', { level: 1, name: 'Devedores' })).toBeVisible()
    await expect(page.getByText('João Araújo')).toBeVisible()
    await a11y('debtors')

    await page.getByText('João Araújo').click()
    await expect(page).toHaveURL(new RegExp(`/debtors/${d.id}$`))
    await expect(page.getByText('Notebook').first()).toBeVisible()
    await a11y('debtor-detail')
  })

  test('register a full payment for an installment of the month', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Ana Inglês' })
    await session.api('POST', '/debts', {
      debtorId: d.id, type: 'PIX', description: 'Curso de inglês', totalAmount: 250,
      numberOfInstallments: 1, firstDueDate: thisMonthISO(28),
    })

    await page.goto('/installments')
    await expect(page.getByRole('heading', { level: 1, name: 'Parcelas' })).toBeVisible()
    await page.getByRole('button', { name: /mês/i }).first().click().catch(() => {})
    await expect(page.getByText('Curso de inglês').first()).toBeVisible()
    await a11y('installments')

    await page.getByRole('button', { name: 'Receber' }).first().click()
    await expect(page.getByText('Registrar pagamento').first()).toBeVisible()
    await a11y('payment-sheet')
    await page.getByRole('button', { name: 'Quitar parcela' }).click()

    // The API now reports the installment as paid.
    await expect
      .poll(async () => {
        const debts = await session.api('GET', `/debtors/${d.id}/debts`)
        return debts[0]?.installments?.[0]?.status
      })
      .toBe('PAID')
  })

  test('create a debt through the form', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Conceição' })
    await page.goto(`/debts/new?debtorId=${d.id}`)
    await a11y('new-debt')

    // Currency input keeps digits as cents: "30000" → R$ 300,00.
    await page.getByPlaceholder('0,00').fill('30000')
    await page.getByPlaceholder('Empréstimo de junho').fill('Vaga de garagem')
    await page.getByRole('button', { name: /^criar/i }).click()

    await expect
      .poll(async () => (await session.api('GET', `/debtors/${d.id}/debts`)).length, { timeout: 10_000 })
      .toBe(1)
  })
})
