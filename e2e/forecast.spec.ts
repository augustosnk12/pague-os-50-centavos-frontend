/** Improvement 69: Recebimentos → "A receber", the next 6 months (with recurring debts projected). */
import { test, expect } from './support/fixtures'

const iso = (monthsFromNow: number, day: number) => {
  const n = new Date()
  return new Date(Date.UTC(n.getFullYear(), n.getMonth() + monthsFromNow, day)).toISOString()
}

test('Recebimentos → A receber: 6 months with the recurring months not created yet, overdue apart, who else pays (real API)', async ({ page, session, a11y }) => {
  const ana = await session.api('POST', '/debtors', { name: 'Ana Previsão' })
  const beto = await session.api('POST', '/debtors', { name: 'Beto Mensal' })
  // 4 × R$ 100 from next month.
  await session.api('POST', '/debts', { debtorId: ana.id, type: 'PIX_INSTALLMENT', description: 'Fogão', totalAmount: 400, numberOfInstallments: 4, firstDueDate: iso(1, 10) })
  // R$ 50 overdue since last month: out of the forecast, on its own line.
  await session.api('POST', '/debts', { debtorId: ana.id, type: 'CASH', description: 'Almoço', totalAmount: 50, numberOfInstallments: 1, firstDueDate: iso(-1, 5) })
  // R$ 150 every month from next month, no end: only the first one exists in the API.
  await session.api('POST', '/debts', { debtorId: beto.id, type: 'PIX', description: 'Vaga', totalAmount: 150, numberOfInstallments: 1, firstDueDate: iso(1, 10), recurrence: { type: 'MONTHLY' } })

  await page.goto('/payments')
  await page.getByRole('radio', { name: 'A receber' }).click()
  await expect(page).toHaveURL(/ver=a-receber/)
  await expect(page.getByText('Próximos 6 meses · o que ainda vai entrar')).toBeVisible()
  // Export belongs to "Recebido".
  await expect(page.getByRole('button', { name: /Exportar planilha/ })).toHaveCount(0)

  const card = page.getByRole('region', { name: 'Previsto nos próximos 6 meses' })
  // The big total is a <Money> ("R$" in its own span).
  await expect(card).toContainText(/Previsto\s*R\$\s?1\.150,00/)
  const bars = card.getByRole('list', { name: 'Previsto por mês' }).getByRole('listitem')
  await expect(bars).toHaveCount(6)
  const values = (await bars.allTextContents()).map((t) => t.replace(/\s/g, ' ').match(/R\$\s[\d.,]+/)?.[0].replace(/\s/, ' '))
  expect(values).toEqual(['R$ 0,00', 'R$ 250,00', 'R$ 250,00', 'R$ 250,00', 'R$ 250,00', 'R$ 150,00'])
  await expect(card).toContainText('9 parcelas')
  await expect(card).toContainText(/Inclui R\$\s750,00 de mensalidades/)
  await expect(card).toContainText(/Fora da conta: R\$\s50,00 em atraso · 1 parcela/)

  const people = page.getByRole('list', { name: 'Quem mais vai te pagar' }).getByRole('link')
  await expect(people).toHaveCount(2)
  await expect(people.nth(0)).toHaveAccessibleName(/^Beto Mensal, 5 parcelas até \w+.*, R\$\s750,00$/)
  await expect(people.nth(1)).toHaveAccessibleName(/^Ana Previsão, 4 parcelas até \w+.*, R\$\s400,00$/)
  await a11y('forecast')

  // The overdue line leads to Parcelas → Atrasadas.
  await card.getByRole('link', { name: 'Ver as 1 parcela em atraso' }).click()
  await expect(page).toHaveURL(/\/installments\?aba=atrasadas/)

  // Back on Recebimentos, the URL keeps the view; "Recebido" brings the period and Export back.
  await page.goBack()
  await expect(page.getByRole('radio', { name: 'A receber' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Recebido' }).click()
  await expect(page).not.toHaveURL(/ver=/)
  await expect(page.getByRole('button', { name: /Exportar planilha/ })).toBeVisible()

  // A person opens the profile.
  await page.goto('/payments?ver=a-receber')
  await page.getByRole('link', { name: /^Ana Previsão/ }).click()
  await expect(page).toHaveURL(new RegExp(`/debtors/${ana.id}`))
})
