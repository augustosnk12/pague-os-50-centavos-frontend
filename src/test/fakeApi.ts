import type { Debtor } from '../types/debtor'
import type { InstallmentEnriched } from '../types/installment'
import type { DashboardData } from '../types/dashboard'

/**
 * Minimal in-memory stand-in for the API used by smoke tests. It answers the
 * same URLs the app calls today (src/api/*.ts), with realistic payloads.
 */
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
  dashboard: {
    month: '2026-11', totalExpected: '250.00', totalReceived: '0.00', totalPending: '250.00', totalOverdue: '0.00',
    counts: { paid: 0, pending: 1, overdue: 0, total: 1 },
  } satisfies DashboardData,
}

export function fakeGet(url: string): unknown {
  if (url === '/dashboard') return fixtures.dashboard
  if (url === '/installments') return fixtures.installments
  if (url === '/debtors') return fixtures.debtors
  const debtor = url.match(/^\/debtors\/([^/]+)$/)
  if (debtor) return fixtures.debtors.find((d) => d.id === debtor[1])
  if (/^\/debtors\/[^/]+\/debts$/.test(url)) return []
  throw new Error(`fakeApi: unhandled GET ${url}`)
}
