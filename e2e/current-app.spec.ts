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

test('dark theme passes the same accessibility checks', async ({ page, session, a11y }) => {
  const d = await session.api('POST', '/debtors', { name: 'Escuro Teste', phone: '11999990000' })
  await session.api('POST', '/debts', {
    debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Notebook', totalAmount: 600,
    numberOfInstallments: 3, firstDueDate: thisMonthISO(28),
  })
  await page.addInitScript(() => localStorage.setItem('lt-theme', 'dark'))

  await page.goto('/dashboard')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await a11y('dark-dashboard')
  await page.goto('/debtors')
  await expect(page.getByText('Escuro Teste')).toBeVisible()
  await a11y('dark-debtors')
  await page.goto(`/debtors/${d.id}`)
  await expect(page.getByText('Notebook').first()).toBeVisible()
  await a11y('dark-debtor-detail')
  await page.goto('/installments')
  await expect(page.getByText('Notebook').first()).toBeVisible()
  await a11y('dark-installments')
  await page.getByRole('button', { name: 'Receber' }).first().click()
  await expect(page.getByText('Registrar pagamento').first()).toBeVisible()
  await a11y('dark-payment-sheet')
})

test('keyboard: first Tab is the skip link; overdue badge counts previous months (real API)', async ({ page, session, a11y }) => {
  const d = await session.api('POST', '/debtors', { name: 'Atrasado Antigo' })
  // Due last month and unpaid: the old badge (current month, stored status) never counted it.
  const now = new Date()
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 5)).toISOString()
  await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Empréstimo', totalAmount: 90, numberOfInstallments: 1, firstDueDate: lastMonth })

  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()

  const badge = page.getByRole('link', { name: 'Parcelas, 1 atrasada' })
  // The bottom tabs exist only on small screens; on desktop the header nav has no badge yet (S1).
  if ((page.viewportSize()?.width ?? 0) < 880) await expect(badge).toBeVisible()
  await a11y('dashboard-with-overdue')
})

test('Back restores the scroll position; a new screen starts at the top', async ({ page, session }) => {
  const d = await session.api('POST', '/debtors', { name: 'Rolagem' })
  for (let k = 0; k < 12; k++) {
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: `Dívida ${k}`, totalAmount: 10 + k, numberOfInstallments: 1, firstDueDate: thisMonthISO(20) })
  }
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto('/installments')
  await expect(page.getByText('Dívida 11').first()).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 600))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)

  await page.getByRole('link', { name: 'Devedores' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Devedores' })).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Parcelas' })).toBeFocused()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
})

test.describe('failures (F4)', () => {
  test('offline: banner, and a payment is blocked with "nada foi salvo"', async ({ page, session, context, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Sem Rede' })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Offline', totalAmount: 50, numberOfInstallments: 1, firstDueDate: thisMonthISO(28) })
    await page.goto('/installments')
    await expect(page.getByText('Offline').first()).toBeVisible()

    await context.setOffline(true)
    await expect(page.getByRole('status').filter({ hasText: 'Sem conexão' })).toBeVisible()
    await a11y('offline-banner')
    await page.getByRole('button', { name: 'Receber' }).first().click()
    await page.getByRole('button', { name: 'Quitar parcela' }).click()
    await expect(page.getByText(/nada foi salvo/).first()).toBeVisible()

    await context.setOffline(false)
    // Nothing was queued to be sent later either.
    await page.waitForTimeout(1500)
    const debts = await session.api('GET', `/debtors/${d.id}/debts`)
    expect(debts[0].installments[0].status).toBe('PENDING')
  })

  test('expired session: log in again and come back to the same screen', async ({ page, session }) => {
    const l = createLenderWithLoginToken('Volta Pra Cá')
    // A token for an account that does not exist → the API answers 401 (lender guard).
    await page.context().addCookies([{ name: 'pague50_token', value: session.token.replace(/\.[^.]+$/, '.x'), url: 'http://localhost:5199' }])
    await page.goto('/installments?period=week')
    await expect(page).toHaveURL(/\/login\?expired=1$/)
    await expect(page.getByText('Sua sessão expirou')).toBeVisible()

    await page.goto(`${API_URL}/auth/verify?token=${l.token}`)
    await expect(page).toHaveURL(/\/installments\?period=week$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Parcelas' })).toBeVisible()
  })

  test('API down: the screen says it could not load (not "no data") and retries', async ({ page, session, a11y }) => {
    void session
    let fail = true
    // Only the API call (the page itself is also at /debtors).
    await page.route(`${API_URL}/debtors`, (route) => (fail ? route.fulfill({ status: 503, body: '{"error":"down"}', contentType: 'application/json' }) : route.continue()))
    await page.goto('/debtors')
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar' })).toBeVisible()
    await expect(page.getByText('Nenhum devedor ainda')).toHaveCount(0)
    await a11y('load-error')
    fail = false
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Devedores' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar' })).toHaveCount(0)
  })
})
