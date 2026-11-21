import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pages } from '../../router/routes'
import { debtorQuery } from './useDebtor'
import { debtsByDebtorQuery } from '../debts/useDebtsByDebtor'

/**
 * On intent (pointer over, focus, touch) on a link to a profile, start
 * downloading the page's code and the person's data (improvement 43), so the
 * click usually opens a ready screen. Fresh data is not fetched again.
 */
export function usePrefetchDebtor() {
  const qc = useQueryClient()
  return useCallback(
    (id: string) => {
      void pages.debtorDetail.preload()
      void qc.prefetchQuery(debtorQuery(id))
      void qc.prefetchQuery({ ...debtsByDebtorQuery(id), staleTime: 30_000 })
    },
    [qc],
  )
}
