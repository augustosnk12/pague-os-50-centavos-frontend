/** Improvement 71: "Esconder valores" blurs every amount on every screen and is remembered on the device. */
import { test, expect, thisMonthISO } from './support/fixtures'

test('Esconder valores: the eye blurs every amount on every screen, survives a reload and turns off again', async ({ page, session, a11y }) => {
  const d = await session.api('POST', '/debtors', { name: 'Vera Valores' })
  await session.api('POST', '/debts', {
    debtorId: d.id, type: 'PIX_INSTALLMENT', description: 'Geladeira', totalAmount: 1200, numberOfInstallments: 4,
    firstDueDate: thisMonthISO(1),
  })

  await page.goto('/dashboard')
  const eye = page.getByRole('region', { name: /A receber em/ }).getByRole('button', { name: 'Esconder valores' })
  await expect(eye).toHaveAttribute('aria-pressed', 'false')
  await eye.click()
  await expect(eye).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.lt-toast').getByText('Valores escondidos')).toBeVisible()

  /** Every amount on the screen is blurred (and there is at least one). */
  const allBlurred = async (where: string) => {
    const amts = page.locator('.lt-amt')
    await expect(amts.first(), where).toBeVisible()
    const filters = await amts.evaluateAll((els) => els.map((el) => getComputedStyle(el).filter))
    expect(filters.length, where).toBeGreaterThan(0)
    for (const f of filters) expect(f, where).toContain('blur')
  }
  await allBlurred('Painel')
  await a11y('dashboard-hidden-values')

  // Names and dates stay visible; amounts stay hidden on the other screens too.
  await page.goto('/installments')
  await expect(page.getByText('Vera Valores').first()).toBeVisible()
  await allBlurred('Parcelas')
  await page.goto(`/debtors/${d.id}`)
  await allBlurred('Perfil')

  // Remembered on the device.
  await page.reload()
  await allBlurred('Perfil depois de recarregar')

  // Desktop: the same eye is in the header and turns it off.
  if ((page.viewportSize()?.width ?? 0) >= 880) {
    await page.getByRole('banner').getByRole('button', { name: 'Esconder valores' }).click()
  } else {
    await page.goto('/dashboard')
    await page.getByRole('region', { name: /A receber em/ }).getByRole('button', { name: 'Esconder valores' }).click()
  }
  await expect(page.locator('.lt-toast').getByText('Valores à mostra')).toBeVisible()
  // The blur fades out (short transition): wait for it to end.
  await expect
    .poll(() => page.locator('.lt-amt').evaluateAll((els) => els.every((el) => getComputedStyle(el).filter === 'none')))
    .toBe(true)
})
