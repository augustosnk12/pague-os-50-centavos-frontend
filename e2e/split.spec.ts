/** Item 66: split a bill with several people (POST /debts/split), and its Desfazer. */
import { test, expect } from './support/fixtures'

test('Nova dívida → Dividir: who (everyone listed to tick, Cadastrar), parts at the end, "Criar 3 dívidas" and Desfazer (real API)', async ({ page, session, a11y }) => {
  const mari = await session.api('POST', '/debtors', { name: 'Mariana Jantar' })
  await session.api('POST', '/debtors', { name: 'Bia Jantar' })

  // Devedores › Adicionar opens with the cursor in Nome.
  await page.goto('/debtors')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Novo devedor' }).getByRole('textbox', { name: /Nome/ })).toBeFocused()
  await page.keyboard.press('Escape')

  await page.goto(`/debts/new?debtorId=${mari.id}`)
  await expect(page.getByRole('button', { name: 'Trocar devedor (Mariana Jantar)' })).toBeVisible()
  await page.getByRole('switch', { name: /Dividir com mais pessoas/ }).click()
  // Everyone is listed to tick: no name to remember.
  await page.getByRole('list', { name: 'Seus devedores' }).getByRole('checkbox', { name: /Bia Jantar/ }).click()
  // Someone new goes straight into the split.
  await page.getByRole('button', { name: 'Cadastrar pessoa' }).click()
  const form = page.getByRole('dialog', { name: 'Novo devedor' })
  await form.getByRole('textbox', { name: /Nome/ }).fill('Rafa Novo')
  await form.getByRole('button', { name: /Salvar|Cadastrar/ }).last().click()
  await expect(form).toHaveCount(0)
  const toks = page.getByRole('list', { name: 'Quem divide' })
  await expect(toks.getByRole('listitem')).toHaveCount(4)
  await expect(toks).toContainText('Rafa')

  await page.getByRole('button', { name: /Pix parcelado/ }).click()
  await page.getByRole('textbox', { name: /Valor total da conta/ }).fill('320,00')
  await page.getByRole('textbox', { name: 'Parcelas' }).fill('3')
  await page.getByRole('textbox', { name: 'Descrição' }).fill('Jantar de sexta')
  const parts = page.getByRole('list', { name: 'Parte de cada pessoa' })
  await expect(parts.getByRole('listitem')).toHaveCount(4)
  await expect(parts.getByRole('listitem').first()).toContainText(/R\$\s80,00/)
  await expect(parts.getByRole('listitem').first()).toContainText(/R\$\s26,66 \+ 2× R\$\s26,67/)
  await a11y('split')

  const created = page.waitForResponse((r) => r.url().endsWith('/debts/split') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Criar 3 dívidas' }).click()
  expect((await created).status()).toBe(201)
  const toast = page.getByText(/^3 dívidas criadas · Mariana, Bia, Rafa$/)
  await expect(toast).toBeVisible()

  // Each one owes its part, split into 3.
  const debts = await session.api('GET', `/debtors/${mari.id}/debts`)
  expect(debts).toHaveLength(1)
  expect(debts[0]).toMatchObject({ description: 'Jantar de sexta', type: 'PIX_INSTALLMENT', totalAmount: '80.00' })
  expect(debts[0].installments.map((i: { amount: string }) => i.amount)).toEqual(['26.66', '26.67', '26.67'])

  // Desfazer removes all of them.
  const undone = page.waitForResponse((r) => /\/debts\/split\/[^/]+$/.test(r.url()) && r.request().method() === 'DELETE')
  await page.getByRole('button', { name: 'Desfazer' }).click()
  expect((await undone).status()).toBe(200)
  await expect(page.getByText('Divisão desfeita').first()).toBeVisible()
  expect(await session.api('GET', `/debtors/${mari.id}/debts`)).toHaveLength(0)
})
