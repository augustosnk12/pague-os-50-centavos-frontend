/**
 * Opening a sheet locks the page (body overflow: hidden), which removes the
 * scroll bar; `scrollbar-gutter: stable` keeps its space so nothing jumps.
 * Own file: headless Chromium hides scroll bars by default, and turning that
 * off is a launch option (it needs its own worker).
 */
import { test, expect } from './support/fixtures'

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })

test('opening a sheet over a long list does not shift the page sideways (scrollbar-gutter)', async ({ page, session }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 880, 'phones use overlay scroll bars')
  const d = await session.api('POST', '/debtors', { name: 'Lia Lista' })
  const n = new Date()
  await session.api('POST', '/debts', {
    debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Celular', totalAmount: 1200, numberOfInstallments: 12,
    firstDueDate: new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1)).toISOString(),
  })
  await page.goto('/installments')
  const h1 = page.getByRole('heading', { level: 1, name: 'Parcelas' })
  await expect(h1).toBeVisible()
  // Long enough to scroll, and the browser draws a classic (space-taking) bar.
  await page.evaluate(() => document.body.style.setProperty('min-height', '3000px'))
  expect(await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBeGreaterThan(0)

  const before = (await h1.boundingBox())!.x
  await page.getByRole('button', { name: /Registrar pagamento$/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect((await h1.boundingBox())!.x).toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await h1.boundingBox())!.x).toBe(before)
})
