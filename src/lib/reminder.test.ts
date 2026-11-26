import { describe, it, expect } from 'vitest'
import { chargeMessage, CUSTOM_STARTER, fillTemplate, pixBlock, reminderItems, reminderText, reminderTotal } from './reminder'

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

describe('charge message your way (item 68)', () => {
  const items = [
    { id: 'm', label: 'Mercado (1/1)', dueDate: '2026-11-01T00:00:00.000Z', cents: 3550, overdue: true },
    { id: 'n', label: 'Notebook (2/3)', dueDate: '2026-11-05T00:00:00.000Z', cents: 6000, overdue: true },
  ]
  const PIX = pixBlock('000201…', 9550)
  /** fmtMoney uses a no-break space after R$. */
  const sp = (s: string) => s.replace(/\u00a0/g, ' ')

  it('Amigável (or no tone from the API) is the message of today, Pix at the end', () => {
    expect(chargeMessage(undefined, 'Ana', items)).toBe(reminderText('Ana', items))
    expect(chargeMessage({ chargeTone: null }, 'Ana', items, PIX)).toBe(reminderText('Ana', items) + PIX)
    expect(chargeMessage({ chargeTone: 'FRIENDLY', chargeTemplate: 'x' }, 'Ana', items)).toBe(reminderText('Ana', items))
  })

  it('Direta: the Pix goes where {pix} is; its line disappears without Pix', () => {
    expect(sp(chargeMessage({ chargeTone: 'DIRECT' }, 'Ana', items))).toBe(
      ['Olá, Ana. Seguem os valores em aberto:', '• Mercado (1/1) — R$ 35,50 · venceu 01 nov', '• Notebook (2/3) — R$ 60,00 · venceu 05 nov', 'Total: R$ 95,50.', 'Por favor, me avise quando pagar.'].join('\n'),
    )
    expect(sp(chargeMessage({ chargeTone: 'DIRECT' }, 'Ana', items, PIX))).toContain('Total: R$ 95,50.\nPix copia e cola (R$ 95,50):\n000201…\nPor favor')
  })

  it('Minha: every variable, repeated ones too; unknown ones stay; no {pix} = block at the end; empty text = Amigável', () => {
    const tpl = '{nome}, {nome}! Deve {total}:\n{itens}\n{link} fica'
    expect(sp(chargeMessage({ chargeTone: 'CUSTOM', chargeTemplate: tpl }, 'Ana', items))).toBe(
      'Ana, Ana! Deve R$ 95,50:\n• Mercado (1/1) — R$ 35,50 · venceu 01 nov\n• Notebook (2/3) — R$ 60,00 · venceu 05 nov\n{link} fica',
    )
    expect(chargeMessage({ chargeTone: 'CUSTOM', chargeTemplate: 'Oi {nome}' }, 'Ana', items, PIX)).toBe('Oi Ana' + PIX)
    expect(chargeMessage({ chargeTone: 'CUSTOM', chargeTemplate: '  ' }, 'Ana', items)).toBe(reminderText('Ana', items))
    // "$&" in a name is not a replacement pattern.
    expect(fillTemplate('Oi {nome}', '$&', items)).toBe('Oi $&')
    expect(fillTemplate(CUSTOM_STARTER, 'Ana', items)).not.toMatch(/\n\n\n|\{pix\}/)
  })
})
