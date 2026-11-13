import { describe, it, expect } from 'vitest'
import { pixBlock, reminderItems, reminderText, reminderTotal } from './reminder'

const TODAY = '2026-11-09'
const inst = (id: string, number: number, due: string, amount = '100.00', paidAmount = '0.00') => ({ id, number, amount, paidAmount, dueDate: `${due}T00:00:00.000Z` })

describe('WhatsApp reminder', () => {
  const debts = [
    { description: 'Notebook', installments: [inst('a', 1, '2026-10-05', '100.00', '100.00'), inst('b', 2, '2026-11-05', '100.00', '40.00'), inst('c', 3, '2026-12-05')] },
    { description: 'Mercado', installments: [inst('d', 1, '2026-11-01', '35.50')] },
  ]

  it('lists the overdue ones (what is left of each), oldest first', () => {
    const items = reminderItems(debts, TODAY)
    expect(items.map((i) => [i.label, i.cents])).toEqual([['Mercado (1/1)', 3550], ['Notebook (2/3)', 6000]])
    expect(reminderTotal(items)).toBe(9550)
  })

  it('nothing overdue: only the next one', () => {
    const items = reminderItems(debts, '2026-10-20')
    expect(items.map((i) => i.id)).toEqual(['d'])
  })

  it('recurring debts say "mensal"', () => {
    const items = reminderItems([{ description: 'Aluguel', recurrence: 'MONTHLY', installments: [inst('r', 4, '2026-11-01')] }], TODAY)
    expect(items[0].label).toBe('Aluguel (↻ mensal)')
  })

  it('message text', () => {
    const text = reminderText('Ana', reminderItems(debts, TODAY))
    expect(text).toBe(
      [
        'Oi, Ana! Tudo bem? 😊',
        'Passando pra lembrar das parcelas em aberto:',
        '• Mercado (1/1) — R$ 35,50 · venceu 01 nov',
        '• Notebook (2/3) — R$ 60,00 · venceu 05 nov',
        'Total: R$ 95,50.',
        '',
        'Pode me mandar no Pix? Obrigado!',
      ].join('\n'),
    )
    expect(pixBlock('000201…', 9550)).toBe('\n\nPix copia e cola (R$ 95,50):\n000201…')
  })
})
