import { useMutation, useQueryClient } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors.api'
import { debtsApi } from '../../api/debts.api'
import { paymentsApi, type BatchBody } from '../../api/payments.api'

/** Everything that changes what a debtor owes or where they appear. */
function useRefresh() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['debtors', 'debts', 'dashboard', 'installments', 'search']) void qc.invalidateQueries({ queryKey: [key] })
  }
}

/** Arquivar / Reativar (improvement 41, API B10). */
export function useArchiveDebtor() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      (archived ? debtorsApi.archive(id) : debtorsApi.unarchive(id)).then((r) => r.data),
    onSuccess: refresh,
  })
}

/** Quitar / Receber várias (improvements 34 and 49, API B7). */
export function usePaymentBatch() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: BatchBody) => paymentsApi.batch(body).then((r) => r.data),
    onSuccess: refresh,
  })
}

export function useUndoBatch() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (batchId: string) => paymentsApi.undoBatch(batchId).then((r) => r.data),
    onSuccess: refresh,
  })
}

/** Encerrar / Retomar recorrência (improvement 39, API B6). */
export function useSetRecurrence() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ debtId, active }: { debtId: string; active: boolean }) => debtsApi.setRecurrence(debtId, active).then((r) => r.data),
    onSuccess: refresh,
  })
}

/** Alterar término da recorrência. */
export function useSetRecurrenceEnd() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ debtId, ...body }: { debtId: string; occurrences: number | null; endsAt: string | null; today: string }) =>
      debtsApi.setRecurrenceEnd(debtId, body).then((r) => r.data),
    onSuccess: refresh,
  })
}
