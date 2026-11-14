import type { Debtor } from '../types/debtor'
import type { InstallmentEnriched } from '../types/installment'
import type { DashboardOverview } from '../types/dashboard'

/**
 * Minimal in-memory stand-in for the API used by smoke tests. It answers the
 * same URLs the app calls today (src/api/*.ts), with realistic payloads.
 */
function overdueInst(id: string, due: string, amount: string, description: string, number: number, count: number): InstallmentEnriched {
  return {
    id, number, amount, paidAmount: '0.00', dueDate: `${due}T00:00:00.000Z`, paidAt: null, status: 'PENDING', debtId: `debt-${id}`, payments: [],
    debt: { id: `debt-${id}`, description, type: 'PIX', debtorId: 'd1', installmentCount: count, recurrence: null,
      debtor: { id: 'd1', name: 'João Araújo', avatarHue: 200, avatarEmoji: null } },
  }
}

export const fixtures = {
  debtors: [
    {
      id: 'd1', name: 'João Araújo', email: null, phone: '11999990000', notes: null,
      reliability: 'GOOD_PAYER', avatarHue: 200, avatarEmoji: null, lenderId: 'lender-1',
      createdAt: '2026-06-01T00:00:00.000Z', address: null,
    },
  ] satisfies Debtor[],
  installments: [
    {
      id: 'i1', number: 2, amount: '250.00', paidAmount: '0.00', dueDate: '2026-11-10T00:00:00.000Z',
      paidAt: null, status: 'PENDING', debtId: 'debt1', payments: [],
      debt: { id: 'debt1', description: 'Notebook', type: 'CREDIT_CARD', debtorId: 'd1',
        debtor: { id: 'd1', name: 'João Araújo', avatarHue: 200, avatarEmoji: null } },
    },
  ] satisfies InstallmentEnriched[],
  overview: {
    today: '2026-11-05',
    month: { key: '2026-11', expected: '250.00', received: '0.00', remaining: '250.00', receivedPct: 0 },
    overdue: { amount: '180.00', count: 2, fromPreviousMonths: { amount: '90.00', count: 1 } },
    attention: {
      overdue: [
        overdueInst('o1', '2026-10-20', '90.00', 'Empréstimo', 1, 1),
        overdueInst('o2', '2026-11-02', '90.00', 'Mercado', 3, 6),
      ],
      today: [],
      next7: [] as InstallmentEnriched[],
    },
    counts: { overdue: 2, today: 0, next7: 1 },
  } satisfies DashboardOverview,
  summary: { debtors: 1, debts: 1, installments: 1, payments: 0 },
  search: {
    debtors: [{ id: 'd1', name: 'João Araújo', avatarHue: 200, avatarEmoji: null, outstanding: '250.00', archived: false }],
    debts: [{ id: 'debt1', description: 'Notebook', debtorId: 'd1', debtorName: 'João Araújo', remaining: '250.00', recurring: false }],
  },
}

fixtures.overview.attention.next7.push(fixtures.installments[0])

export function fakeGet(url: string): unknown {
  if (url === '/dashboard/overview') return fixtures.overview
  if (url === '/me/summary') return fixtures.summary
  if (url === '/search') return fixtures.search
  if (url === '/installments') return fixtures.installments
  if (url === '/debtors') return fixtures.debtors
  if (url === '/debtors?archived=true') return []
  const debtor = url.match(/^\/debtors\/([^/]+)$/)
  if (debtor) return fixtures.debtors.find((d) => d.id === debtor[1])
  if (/^\/debtors\/[^/]+\/debts$/.test(url)) return []
  throw new Error(`fakeApi: unhandled GET ${url}`)
}
