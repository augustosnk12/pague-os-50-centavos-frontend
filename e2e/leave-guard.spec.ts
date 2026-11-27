/** Nova dívida with something typed: leaving asks first (tabs, menu, the browser's back); saving does not. */
import type { Page } from '@playwright/test'
import { test, expect } from './support/fixtures'

/** "+" on phones, the top button on computers. */
const tapNewDebt = (page: Page, mobile: boolean) =>
  mobile ? page.getByRole('button', { name: 'Nova dívida' }).click() : page.getByRole('banner').getByRole('button', { name: /Nova dívida/ }).click()

test('"Nova dívida" again while on it: nothing typed = nothing happens; typed = "Começar outra dívida?"; never a useless history entry', async ({ page, session }, info) => {
  const mobile = info.project.name === 'mobile'
  const d = await session.api('POST', '/debtors', { name: 'Gui Outra' })
  const ask = page.getByRole('dialog', { name: 'Começar outra dívida?' })
  await page.goto('/dashboard')
  await page.goto(`/debts/new?debtorId=${d.id}`)
  await expect(page.getByRole('button', { name: 'Trocar devedor (Gui Outra)' })).toBeVisible()
  const len = () => page.evaluate(() => history.length)
  const before = await len()

  // Nothing typed (the person came with the address): stays, no question, no new entry.
  await tapNewDebt(page, mobile)
  await page.waitForTimeout(300)
  await expect(ask).toHaveCount(0)
  expect(await len()).toBe(before)

  // Typed: asks. "Continuar esta" keeps everything.
  await page.getByRole('textbox', { name: /Valor total/ }).fill('120,00')
  await tapNewDebt(page, mobile)
  await expect(ask).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Sair sem criar a dívida?' })).toHaveCount(0)
  await ask.getByRole('button', { name: 'Continuar esta' }).click()
  await expect(page.getByRole('textbox', { name: /Valor total/ })).toHaveValue('120,00')

  // "Começar do zero": empty form, no person, plain address.
  await tapNewDebt(page, mobile)
  await ask.getByRole('button', { name: 'Começar do zero' }).click()
  await expect(page.getByRole('textbox', { name: /Valor total/ })).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Buscar devedor', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/debts\/new$/)
  // Nothing typed any more: leaving does not ask, and "back" goes to the Painel.
  await page.goBack()
  await expect(page).toHaveURL(/\/dashboard/)
})

test('Nova dívida asks before leaving with something typed; saving leaves without asking and history stays clean (real API)', async ({ page, session }, info) => {
  const mobile = info.project.name === 'mobile'
  const d = await session.api('POST', '/debtors', { name: 'Gui Guarda' })
  const ask = page.getByRole('dialog', { name: 'Sair sem criar a dívida?' })

  await page.goto('/installments')
  await page.goto(`/debts/new?debtorId=${d.id}`)
  await expect(page.getByRole('button', { name: 'Trocar devedor (Gui Guarda)' })).toBeVisible()
  await page.getByRole('textbox', { name: /Valor total/ }).fill('120,00')

  // A tab (mobile) / a top link (desktop).
  const nav = mobile ? page.getByRole('navigation', { name: 'Abas' }) : page.getByRole('navigation', { name: 'Principal' })
  await nav.getByRole('link', { name: /^Devedores/ }).click()
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(ask).toHaveCount(0)
  await expect(page).toHaveURL(/\/debts\/new/)

  // The browser's back (Android's back gesture): asks, and staying keeps the form.
  await page.goBack()
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page).toHaveURL(/\/debts\/new/)
  await expect(page.getByRole('textbox', { name: /Valor total/ })).toHaveValue('120,00')

  // Account items (sheet on phones, menu on computers) ask too.
  if (mobile) {
    await page.getByRole('navigation', { name: 'Abas' }).getByRole('button', { name: 'Conta' }).click()
    await page.getByRole('dialog', { name: /^Conta/ }).getByRole('button', { name: 'Configurações' }).click()
  } else {
    await page.getByRole('button', { name: 'Conta' }).click()
    await page.getByRole('menu', { name: 'Conta' }).getByRole('menuitem', { name: 'Configurações' }).click()
  }
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page).toHaveURL(/\/debts\/new/)

  // Back again, now leaving: goes to the page before Nova dívida (Parcelas).
  await page.goBack()
  await ask.getByRole('button', { name: 'Sair e descartar' }).click()
  await expect(page).toHaveURL(/\/installments/)

  // Saving: no question, and "back" from the profile skips the finished form.
  await page.goto(`/debts/new?debtorId=${d.id}`)
  await page.getByRole('textbox', { name: /Valor total/ }).fill('80,00')
  await page.locator('.lt-nd-foot').getByRole('button', { name: /^Criar dívida/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Gui Guarda/ })).toBeVisible()
  await expect(ask).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/installments/)
})
