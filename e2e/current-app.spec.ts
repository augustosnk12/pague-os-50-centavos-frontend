/**
 * Regression suite for the app as it is today, against the real API and a real
 * PostgreSQL. It must stay green while UI v2 ships: tests are only updated in
 * the same PR that redesigns the screen they cover.
 */
import { test, expect, createLenderWithLoginToken, createLenderWithCode, thisMonthISO } from './support/fixtures'
import { API_URL } from './support/env.mjs'

test('magic link: the API verifies the token and the app lands on the dashboard', async ({ page, a11y }) => {
  const l = createLenderWithLoginToken('Maria Teste')
  await page.goto(`${API_URL}/auth/verify?token=${l.token}`)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1, name: /olá, maria/i })).toBeVisible()
  // Brand-new account: the Painel guides the first steps (improvement 48).
  await expect(page.getByRole('region', { name: 'Comece em 2 passos' })).toBeVisible()
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
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
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

    await page.getByRole('button', { name: /Registrar pagamento$/ }).first().click()
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
  await page.getByRole('button', { name: /Registrar pagamento$/ }).first().click()
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
  // S1: the hero pill sums every overdue amount, including previous months.
  await expect(page.getByRole('link', { name: /R\$\s90,00 em atraso · 1 de meses anteriores/ })).toBeVisible()
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
    await page.getByRole('button', { name: /Registrar pagamento$/ }).first().click()
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

test('user menu: keyboard (Enter, arrows, Esc returns focus) and accessible', async ({ page, session, a11y }) => {
  void session
  test.skip((page.viewportSize()?.width ?? 0) < 880, 'header menu is desktop-only')
  await page.goto('/dashboard')
  const button = page.getByRole('button', { name: 'Conta' })
  await button.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Conta' })
  await expect(menu).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menuitem', { name: /Tema/ })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Sair' })).toBeFocused()
  await page.keyboard.press('ArrowDown') // wraps
  await expect(page.getByRole('menuitem', { name: /Tema/ })).toBeFocused()
  await a11y('user-menu')
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(button).toBeFocused()
})

test.describe('Painel (S1)', () => {
  /** A calendar day relative to the browser's today, as the API stores due dates (UTC midnight). */
  const dayFromToday = (offset: number) => {
    const now = new Date()
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset)).toISOString()
  }

  test('agenda grouped by due date; a row opens the payment; paying updates the hero', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Bia Agenda', phone: '11999990000' })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Atrasada', totalAmount: 40, numberOfInstallments: 1, firstDueDate: dayFromToday(-3) })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'De hoje', totalAmount: 25, numberOfInstallments: 1, firstDueDate: dayFromToday(0) })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Celular', totalAmount: 300, numberOfInstallments: 3, firstDueDate: dayFromToday(3) })

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 2, name: 'Em atraso · 1' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Hoje · 1' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Próximos 7 dias · 1' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Em atraso' })).toContainText('3d atraso')
    // installmentCount comes from the API (feat/ui-v2): "1/3".
    await expect(page.getByRole('list', { name: 'Próximos 7 dias' })).toContainText('Celular · 1/3')
    await a11y('dashboard-agenda')
    await page.evaluate(() => localStorage.setItem('lt-theme', 'dark'))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('list', { name: 'Em atraso' })).toBeVisible()
    await a11y('dark-dashboard-agenda')

    await page.getByRole('button', { name: /^Bia Agenda, De hoje, .*vence hoje\. Registrar pagamento$/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Quitar parcela' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /^Hoje/ })).toHaveCount(0)
    await expect(page.getByRole('region', { name: /A receber em/ })).toContainText('recebido')
  })

  test('first use: add the first person, then step 2 opens the new debt for them', async ({ page, session, a11y }) => {
    void session
    await page.goto('/dashboard')
    const card = page.getByRole('region', { name: 'Comece em 2 passos' })
    await expect(card.getByRole('button', { name: 'Nova dívida' })).toHaveAttribute('aria-disabled', 'true')
    await card.getByRole('button', { name: 'Adicionar' }).click()
    await page.getByLabel('Nome').fill('Maria Primeira')
    await page.getByRole('dialog').getByRole('button', { name: 'Adicionar' }).click()
    await expect(card.getByText('✓ Maria cadastrada')).toBeVisible()
    await a11y('dashboard-first-use-step2')
    await card.getByRole('button', { name: 'Nova dívida' }).click()
    await expect(page).toHaveURL(/\/debts\/new\?debtorId=/)
  })
})

test('payment sheet (S2): context, "Ontem", and "Desfazer" really removes the payment', async ({ page, session, a11y }) => {
  const d = await session.api('POST', '/debtors', { name: 'Davi Desfaz', phone: '11912345678' })
  const now = new Date()
  const due = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 2)).toISOString()
  await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Bicicleta', totalAmount: 300, numberOfInstallments: 3, firstDueDate: due })
  const paid = async () => (await session.api('GET', `/debtors/${d.id}/debts`))[0].installments[0].payments.length

  await page.goto('/dashboard')
  await page.getByRole('button', { name: /^Davi Desfaz, Bicicleta/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Registrar pagamento de Davi Desfaz' })
  await expect(sheet).toContainText('Bicicleta')
  await expect(sheet).toContainText('Parcela 1/3 · atrasada há 2 dias')
  // S5: the button opens the reminder sheet (covered by its own scenario).
  await expect(sheet.getByRole('button', { name: 'Lembrar Davi no WhatsApp' })).toBeVisible()
  await a11y('payment-sheet-overdue')

  // "Outra": DD/MM/AAAA field + the app's calendar (not the browser's).
  await sheet.getByRole('button', { name: 'Outra' }).click()
  // First the field, ready to type; the calendar comes from the trailing icon.
  const other = sheet.getByRole('textbox', { name: 'Outra data do pagamento' })
  await expect(other).toBeFocused()
  await expect(other).toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/)
  await expect(page.getByRole('dialog', { name: /Calendário/ })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Abrir calendário' }).click()
  await expect(page.getByRole('dialog', { name: 'Calendário: Outra data do pagamento' })).toBeVisible()
  await a11y('payment-sheet-calendar')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Calendário/ })).toHaveCount(0)
  await expect(sheet).toBeVisible()

  await sheet.getByRole('button', { name: 'Ontem' }).click()
  await sheet.getByRole('button', { name: /^Quitar parcela · R\$\s100,00$/ }).click()
  await expect(sheet).toHaveCount(0)
  await expect.poll(paid).toBe(1)
  const payment = (await session.api('GET', `/debtors/${d.id}/debts`))[0].installments[0].payments[0]
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  expect(payment.paidAt.slice(0, 10)).toBe(`${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`)

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(page.getByText('Pagamento desfeito')).toBeVisible()
  await expect.poll(paid).toBe(0)
})

test.describe('Parcelas (S3)', () => {
  const day = (offset: number, monthOffset = 0) => {
    const n = new Date()
    return new Date(Date.UTC(n.getFullYear(), n.getMonth() + monthOffset, n.getDate() + offset)).toISOString()
  }

  test('tabs and filters live in the URL; earlier overdue folded; compact bar; filter sheet', async ({ page, session, a11y }) => {
    const ana = await session.api('POST', '/debtors', { name: 'Ana Abril' })
    const bia = await session.api('POST', '/debtors', { name: 'Bia Brito' })
    // One overdue from two months ago (before this month) and several this month.
    await session.api('POST', '/debts', { debtorId: ana.id, type: 'PIX', description: 'Antiga', totalAmount: 70, numberOfInstallments: 1, firstDueDate: day(0, -2) })
    for (let k = 0; k < 14; k++) {
      await session.api('POST', '/debts', { debtorId: k % 2 ? ana.id : bia.id, type: 'PIX', description: `Conta ${k}`, totalAmount: 10 + k, numberOfInstallments: 1, firstDueDate: thisMonthISO(1 + (k % 27)) })
    }

    await page.goto('/installments')
    await expect(page.getByRole('heading', { level: 1, name: 'Parcelas' })).toBeVisible()
    const prev = page.getByRole('button', { name: /1 atrasada de antes deste período/ })
    await expect(prev).toBeVisible()
    await a11y('parcelas')

    // Tab → URL; reload keeps it; the earlier overdue is now inside the list.
    await page.getByRole('tab', { name: /Atrasadas/ }).click()
    await expect(page).toHaveURL(/\/installments\?aba=atrasadas$/)
    await page.reload()
    await expect(page.getByRole('tab', { name: /Atrasadas/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Antiga').first()).toBeVisible()
    await page.getByRole('tab', { name: /Todas/ }).click()

    // Debtor filter.
    await page.getByRole('button', { name: 'Filtrar por devedor: todos os devedores' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtrar por devedor' })
    await sheet.getByRole('button', { name: /Bia Brito/ }).click()
    await a11y('parcelas-filtro')
    await sheet.getByRole('button', { name: 'Ver 1 devedor' }).click()
    await expect(page).toHaveURL(new RegExp(`devedores=${bia.id}`))
    await expect(page.getByRole('button', { name: 'Filtrar por devedor: Bia Brito' })).toBeVisible()
    await expect(page.getByText('Antiga')).toHaveCount(0)

    // Compact bar after scrolling past the tabs (small screen to have room to scroll).
    await page.getByRole('button', { name: 'Filtrar por devedor: Bia Brito' }).click()
    await page.getByRole('dialog', { name: 'Filtrar por devedor' }).getByRole('button', { name: 'Limpar' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.setViewportSize({ width: 390, height: 520 })
    await page.evaluate(() => window.scrollTo(0, 700))
    const bar = page.getByRole('region', { name: 'Período e filtros' })
    await expect(bar).toBeVisible()
    await a11y('parcelas-barra')
    await bar.getByRole('button', { name: /Voltar ao topo/ }).first().click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50)
  })

  test('day mode: week strip and the period in the URL', async ({ page, session }) => {
    const d = await session.api('POST', '/debtors', { name: 'Dora Dia' })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Hoje mesmo', totalAmount: 30, numberOfInstallments: 1, firstDueDate: day(0) })
    await page.goto('/installments')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await expect(page).toHaveURL(/periodo=dia/)
    const strip = page.getByRole('group', { name: 'Dias da semana' })
    await expect(strip.locator('[aria-current="date"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Hoje mesmo')).toBeVisible()
  })
})

test('WhatsApp reminder (S5): message with the overdue total and a Pix copia e cola', async ({ page, session, a11y }) => {
  await session.api('PUT', '/settings', { pixKey: '11987654321', pixKeyType: 'PHONE' })
  const d = await session.api('POST', '/debtors', { name: 'Rita Lembrete', phone: '11912345678', notes: 'Prefere à noite' })
  const n = new Date()
  const due = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() - 3)).toISOString()
  await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Empréstimo', totalAmount: 150, numberOfInstallments: 1, firstDueDate: due })

  await page.goto('/dashboard')
  await page.getByRole('button', { name: /^Rita Lembrete, Empréstimo/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Lembrar Rita no WhatsApp' }).click()
  const sheet = page.getByRole('dialog', { name: 'Lembrar Rita' })
  const text = sheet.getByRole('textbox', { name: 'Mensagem' })
  await expect(text).toHaveValue(/Total: R\$\s150,00\./)
  await expect(sheet).toContainText('Prefere à noite')
  await sheet.getByRole('switch', { name: 'Incluir Pix copia e cola' }).click()
  // Key normalized by the API (+55…) and the exact amount in the BR Code.
  await expect(text).toHaveValue(/Pix copia e cola \(R\$\s150,00\):\n00020126.*\+5511987654321.*5406150\.00/)
  await a11y('remind-sheet')

  const popup = page.waitForEvent('popup')
  await sheet.getByRole('button', { name: 'Abrir WhatsApp' }).click()
  const wa = await popup
  expect(wa.url()).toMatch(/wa\.me\/5511912345678|api\.whatsapp\.com\/send/)
  await wa.close()
  await expect(sheet).toHaveCount(0)
})

test('receipts (S6): from the toast after paying, as an image, and the payoff receipt', async ({ page, session, a11y }) => {
  const d = await session.api('POST', '/debtors', { name: 'Caio Recibo', phone: '11912345678' })
  const n = new Date()
  const due = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString()
  await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Fone', totalAmount: 80, numberOfInstallments: 1, firstDueDate: due })

  await page.goto('/dashboard')
  await page.getByRole('button', { name: /^Caio Recibo, Fone/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^Quitar parcela/ }).click()
  await page.getByRole('button', { name: 'Comprovante' }).click()

  const sheet = page.getByRole('dialog', { name: 'Comprovante' })
  const card = sheet.getByRole('article', { name: /^Comprovante de pagamento P50-/ })
  await expect(card).toContainText('Caio Recibo')
  await expect(card).toContainText('Fone · parcela 1/1')
  await expect(card).toContainText('✓ Quitada')
  await a11y('receipt')

  // Desktop browsers download the PNG (phones open the share sheet instead).
  if ((page.viewportSize()?.width ?? 0) >= 880) {
    const download = page.waitForEvent('download')
    await sheet.getByRole('button', { name: 'Compartilhar ou baixar a imagem do comprovante' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^P50-.+\.png$/)
    const path = await file.path()
    const { readFileSync } = await import('node:fs')
    expect(readFileSync(path).subarray(1, 4).toString()).toBe('PNG')
  }
  await page.keyboard.press('Escape')

  // The debt is now fully paid: the debtor page offers the payoff receipt.
  await page.goto(`/debtors/${d.id}`)
  await page.getByRole('tab', { name: /Quitadas/ }).click()
  await page.getByRole('button', { name: 'Ações da dívida Fone' }).click()
  await page.getByRole('button', { name: /Comprovante de quitação/ }).click()
  const payoff = page.getByRole('dialog', { name: 'Comprovante' }).getByRole('article', { name: /^Comprovante de quitação/ })
  await expect(payoff).toContainText('Fone · 1 parcela')
  await expect(payoff).toContainText('Situação')
  await a11y('receipt-payoff')
})

test.describe('Busca e atalhos (S10)', () => {
  test('search ignores accents; a debt opens its debtor with that debt expanded; Alt+R', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'João Inglês' })
    const debt = await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Curso de inglês', totalAmount: 250, numberOfInstallments: 1, firstDueDate: thisMonthISO(28) })
    const desktop = (page.viewportSize()?.width ?? 0) >= 880

    if (desktop) {
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.keyboard.press('Control+k')
      const box = page.getByRole('combobox', { name: 'Buscar devedor ou dívida' })
      await expect(box).toBeFocused()
      await box.fill('ingles')
      const list = page.getByRole('listbox', { name: 'Resultados da busca' })
      await expect(list.getByRole('group', { name: 'Dívidas' })).toContainText('Curso de inglês')
      await expect(list.getByRole('group', { name: 'Devedores' })).toContainText('João Inglês')
      await a11y('header-search')
      await list.getByRole('option', { name: /Curso de inglês/ }).click()
    } else {
      // Phones: the Devedores search also finds debts.
      await page.goto('/debtors')
      await page.getByRole('searchbox', { name: 'Buscar devedor ou dívida' }).fill('ingles')
      const debts = page.getByRole('list', { name: 'Dívidas encontradas' })
      await expect(debts).toContainText('Curso de inglês')
      await a11y('debtors-search-debts')
      await debts.getByRole('link').click()
    }
    await expect(page).toHaveURL(new RegExp(`/debtors/${d.id}\\?divida=${debt.debt.id}$`))
    // The debt starts expanded.
    await expect(page.getByRole('region', { name: 'Curso de inglês' }).getByRole('button', { name: 'Mostrar só as em aberto' })).toHaveAttribute('aria-expanded', 'true')

    if (desktop) {
      await page.keyboard.press('Alt+r')
      const picker = page.getByRole('dialog', { name: 'Registrar pagamento' })
      await expect(picker.getByRole('list', { name: 'Parcelas em aberto' })).toContainText('João Inglês')
      await a11y('register-picker')
      await picker.getByRole('button', { name: /^João Inglês, Curso de inglês/ }).click()
      await expect(page.getByRole('dialog', { name: 'Registrar pagamento de João Inglês' })).toBeVisible()
    }
  })
})

test.describe('Acesso com código (S13)', () => {
  test('Entrar: e-mail, then the 6-digit code logs in (real /auth/verify-code)', async ({ page, a11y }) => {
    const l = createLenderWithCode('482913')
    // The suite does not send e-mails: only "send the link" is answered here.
    await page.route(`${API_URL}/auth/login`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"message":"ok"}' }))
    await page.goto('/login')
    await a11y('login')
    await page.getByRole('textbox', { name: 'E-mail' }).fill(l.email)
    await page.getByRole('button', { name: /Enviar link de acesso/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeVisible()
    await a11y('check-email')
    const code = page.getByRole('textbox', { name: 'Código de 6 dígitos' })
    await code.fill('000000')
    await expect(page.getByRole('alert').filter({ hasText: 'Código incorreto ou expirado' })).toBeVisible()
    await code.fill('482913')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1, name: /olá, cora/i })).toBeVisible()
  })

  test('Criar conta: the confirmation code already logs in (real /auth/confirm-code)', async ({ page }) => {
    const l = createLenderWithCode('105826', { type: 'CONFIRMATION', name: 'Nina Nova' })
    await page.route(`${API_URL}/auth/register`, (r) => r.fulfill({ status: 201, contentType: 'application/json', body: '{"message":"ok"}' }))
    await page.goto('/register')
    await page.getByRole('textbox', { name: 'Seu nome' }).fill('Nina Nova')
    await page.getByRole('textbox', { name: 'E-mail' }).fill(l.email)
    await page.getByRole('button', { name: /Criar conta/ }).click()
    await page.getByRole('textbox', { name: 'Código de 6 dígitos' }).fill('105826')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1, name: /olá, nina/i })).toBeVisible()
  })

  test('an expired link has its own screen', async ({ page, a11y }) => {
    await page.goto('/login?error=Token%20expired')
    await expect(page.getByRole('heading', { level: 1, name: 'Esse link expirou' })).toBeVisible()
    await a11y('link-expired')
  })
})

test.describe('Perfil do devedor (S4)', () => {
  const day = (offset: number) => {
    const n = new Date()
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() + offset)).toISOString()
  }

  test('Quitar a dívida inteira (one batch), Desfazer, then archive and reactivate (real API)', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Paula Perfil', phone: '11912345678', notes: 'Paga à vista' })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Geladeira', totalAmount: 300, numberOfInstallments: 3, firstDueDate: day(-3) })
    const left = async () => {
      const debts = await session.api('GET', `/debtors/${d.id}/debts`)
      return debts[0].installments.filter((i: { amount: string; paidAmount: string }) => Number(i.amount) > Number(i.paidAmount)).length
    }

    await page.goto(`/debtors/${d.id}`)
    await expect(page.locator('.lt-prof-sum')).toContainText('em atraso')
    const card = page.getByRole('region', { name: 'Geladeira' })
    await expect(card).toContainText('Parcela 1/3')
    await a11y('debtor-profile')

    // Archive is blocked while something is owed.
    await page.getByRole('button', { name: 'Mais ações' }).click()
    await expect(page.getByRole('button', { name: /Arquivar Paula/ })).toHaveAttribute('aria-disabled', 'true')
    await a11y('debtor-actions')
    await page.keyboard.press('Escape')

    await card.getByRole('button', { name: /^Quitar Geladeira/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Quitar Geladeira' })
    await expect(sheet).toContainText('3 parcelas em aberto')
    await sheet.getByRole('button', { name: /^Quitar dívida · R\$\s300,00$/ }).click()
    await expect(page.getByText('Geladeira quitada')).toBeVisible()
    await expect.poll(left).toBe(0)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect.poll(left).toBe(3)

    // Pay it off again and archive.
    await card.getByRole('button', { name: /^Quitar Geladeira/ }).click()
    await page.getByRole('dialog', { name: 'Quitar Geladeira' }).getByRole('button', { name: /^Quitar dívida/ }).click()
    await expect(page.getByText('Nada em aberto')).toBeVisible()
    await page.getByRole('button', { name: 'Mais ações' }).click()
    await page.getByRole('button', { name: /Arquivar Paula/ }).click()
    await expect(page.getByText('Arquivado · fora das listas e dos totais')).toBeVisible()
    // Out of the Devedores list…
    const archived = await session.api('GET', '/debtors')
    expect(archived.some((x: { id: string }) => x.id === d.id)).toBe(false)
    // …and back.
    await page.getByRole('button', { name: 'Reativar', exact: true }).click()
    await expect(page.getByText('Arquivado · fora das listas e dos totais')).toHaveCount(0)
  })
})

test('Busca entre perfis e rolagem depois de folhas encadeadas (real API)', async ({ page, session }) => {
  test.skip(test.info().project.name !== 'desktop')
  const n = new Date()
  const day = (o: number) => new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() + o)).toISOString()
  const a = await session.api('POST', '/debtors', { name: 'Ana Probe', phone: '11912345678' })
  const b = await session.api('POST', '/debtors', { name: 'Bruno Probe', phone: '11912345679' })
  for (const [d, names] of [[a, ['Geladeira', 'Fogão', 'Sofá', 'Mesa', 'TV']], [b, ['Moto']]] as const)
    for (const nm of names) await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX_INSTALLMENT', description: nm, totalAmount: 600, numberOfInstallments: 6, firstDueDate: day(-3) })

  const search = async (q: string, pick: RegExp) => {
    await page.getByRole('button', { name: /Buscar devedor ou dívida/ }).click()
    await page.getByRole('combobox', { name: 'Buscar devedor ou dívida' }).fill(q)
    await page.getByRole('option', { name: pick }).first().click()
  }

  await page.goto(`/debtors/${a.id}`)
  await expect(page.getByRole('region', { name: 'TV' })).toBeVisible()
  // Chained sheets: ⋯ → Ver contato → close.
  await page.getByRole('button', { name: 'Mais ações' }).click()
  await page.getByRole('button', { name: 'Ver contato e anotações', exact: true }).click()
  await page.getByRole('dialog', { name: 'Contato e anotações' }).getByRole('button', { name: 'Fechar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

  await page.getByRole('tab', { name: /Pagamentos/ }).click()
  await search('Bruno', /Bruno Probe/)
  await expect(page.getByRole('heading', { level: 1, name: /Bruno Probe/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Em aberto/ })).toHaveAttribute('aria-selected', 'true')

  await search('Mesa', /Mesa/)
  await expect(page.getByRole('heading', { level: 1, name: /Ana Probe/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mesa' }).getByRole('button', { name: 'Mostrar só as em aberto' })).toBeVisible()
  await page.getByRole('region', { name: 'Mesa' }).getByRole('button', { name: 'Mostrar só as em aberto' }).click()
  await search('Mesa', /Mesa/)
  await expect(page.getByRole('region', { name: 'Mesa' }).getByRole('button', { name: 'Mostrar só as em aberto' })).toBeVisible()

  // Ctrl+K then Esc, then search again.
  await page.keyboard.press('Control+k')
  await page.keyboard.press('Escape')
  await search('Geladeira', /Geladeira/)
  await expect(page.getByRole('region', { name: 'Geladeira' }).getByRole('button', { name: 'Mostrar só as em aberto' })).toBeVisible()
})

test.describe('Receber várias de uma vez (S7)', () => {
  const day = (offset: number) => {
    const n = new Date()
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate() + offset)).toISOString()
  }

  test('one amount for 3 installments of 2 debts: oldest first, last one partial, Desfazer (real API)', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Maria Lote', phone: '11912345678' })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Notebook', totalAmount: 200, numberOfInstallments: 2, firstDueDate: day(-40) })
    await session.api('POST', '/debts', { debtorId: d.id, type: 'PIX', description: 'Mercado', totalAmount: 30, numberOfInstallments: 1, firstDueDate: day(-1) })
    const paid = async () => {
      const debts = await session.api('GET', `/debtors/${d.id}/debts`)
      return debts
        .flatMap((x: { installments: { paidAmount: string }[] }) => x.installments)
        .reduce((sum: number, i: { paidAmount: string }) => sum + Number(i.paidAmount), 0)
    }

    await page.goto(`/debtors/${d.id}`)
    await page.getByRole('button', { name: /Receber várias de uma vez/ }).click()
    const sheet = page.getByRole('dialog', { name: /Receber várias parcelas de Maria Lote/ })
    await expect(sheet.getByRole('checkbox')).toHaveCount(3)
    for (const box of await sheet.getByRole('checkbox').all()) await expect(box).toHaveAttribute('aria-checked', 'true')
    await expect(sheet.getByRole('textbox', { name: 'Valor recebido' })).toHaveValue('230,00')
    await a11y('batch-sheet')

    await sheet.getByRole('textbox', { name: 'Valor recebido' }).fill('210,00')
    await expect(sheet.getByRole('status')).toContainText('Mercado fica parcial (restam R$ 20,00)')
    await sheet.getByRole('button', { name: /^Registrar R\$\s210,00 em 3 parcelas$/ }).click()
    await expect(page.getByText(/R\$\s210,00 registrados em 3 parcelas/)).toBeVisible()
    await expect.poll(paid).toBe(210)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect.poll(paid).toBe(0)
  })
})

test.describe('Nova dívida (S8)', () => {
  test('search the debtor, monthly Pix ending after 3 months, opens the profile on it (real API)', async ({ page, session, a11y }) => {
    const d = await session.api('POST', '/debtors', { name: 'Conceição Mensal' })
    await page.goto('/debts/new')
    await expect(page.locator('.lt-nd-foot').getByRole('status')).toContainText('Escolha para quem é a dívida')
    await a11y('new-debt-empty')

    await page.getByRole('button', { name: 'Buscar devedor', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Para quem é a dívida?' })
    await sheet.getByRole('textbox', { name: 'Buscar devedor pelo nome' }).fill('conceicao')
    await sheet.getByRole('button', { name: /Conceição Mensal/ }).click()
    await expect(page.getByRole('button', { name: 'Trocar devedor (Conceição Mensal)' })).toContainText('Sem saldo em aberto')

    await page.getByRole('switch', { name: /Repetir todo mês/ }).click()
    await page.getByRole('textbox', { name: /Valor por mês/ }).fill('15000')
    await page.getByRole('button', { name: 'Após' }).click()
    await page.locator('#nd-recn input').fill('3')
    await page.getByPlaceholder('Empréstimo de junho').fill('Vaga de garagem')
    await expect(page.getByRole('region', { name: 'Prévia das cobranças' })).toContainText('3 cobranças no total')
    // At the end of the page the sticky footer sits in its place and covers nothing.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await a11y('new-debt-recurring')
    await page.getByRole('button', { name: 'Criar dívida recorrente p/ Conceição' }).click()

    await expect(page.getByRole('region', { name: 'Vaga de garagem' })).toBeVisible()
    const debts = await session.api('GET', `/debtors/${d.id}/debts`)
    expect(debts).toHaveLength(1)
    expect(debts[0]).toMatchObject({ type: 'PIX', recurrence: 'MONTHLY', recurrenceActive: true })
  })
})

test.describe('Término da recorrência', () => {
  test('the card says when it ends; "Alterar término" extends it, refuses an end before what exists (real API)', async ({ page, session, a11y }) => {
    const n = new Date()
    const first = new Date(Date.UTC(n.getFullYear(), n.getMonth() + 1, 10))
    const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
    const plus = (k: number) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + k, 10))
    const d = await session.api('POST', '/debtors', { name: 'Vaga Mensal' })
    await session.api('POST', '/debts', {
      debtorId: d.id, type: 'PIX', description: 'Vaga de garagem', totalAmount: 150, numberOfInstallments: 1,
      firstDueDate: first.toISOString(), recurrence: { type: 'MONTHLY', occurrences: 3 },
    })

    await page.goto(`/debtors/${d.id}`)
    const card = page.getByRole('region', { name: 'Vaga de garagem' })
    await expect(card).toContainText(`até ${fmt(plus(2))}`)
    await card.getByRole('button', { name: 'Ações da dívida Vaga de garagem' }).click()
    await page.getByRole('button', { name: /Alterar término/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Alterar término' })
    await expect(sheet.getByRole('button', { name: 'Após' })).toHaveAttribute('aria-pressed', 'true')
    await a11y('recurrence-end')

    const count = sheet.getByRole('textbox', { name: 'Número de cobranças no total' })
    await count.fill('0')
    await expect(sheet.getByRole('status')).toContainText('o mínimo é 1')
    await expect(sheet.getByRole('button', { name: /Salvar término/ })).toBeDisabled()
    await count.fill('6')
    await expect(sheet.getByRole('status')).toContainText(`Última cobrança em ${fmt(plus(5))}`)
    await sheet.getByRole('button', { name: /Salvar término/ }).click()
    await expect(page.getByText('Término alterado')).toBeVisible()
    await expect(card).toContainText(`até ${fmt(plus(5))}`)

    await card.getByRole('button', { name: 'Ações da dívida Vaga de garagem' }).click()
    await page.getByRole('button', { name: /Alterar término/ }).click()
    await page.getByRole('dialog', { name: 'Alterar término' }).getByRole('button', { name: 'Sem fim' }).click()
    await page.getByRole('dialog', { name: 'Alterar término' }).getByRole('button', { name: /Salvar término/ }).click()
    await expect(card).toContainText('sem fim')
    const debts = await session.api('GET', `/debtors/${d.id}/debts`)
    expect(debts[0]).toMatchObject({ recurrenceOccurrences: null, recurrenceEndsAt: null })
  })
})
