import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useRequestLimit } from './usePlan'
import type { MyPlan } from '../../api/plan.api'
import { getApiError } from '../../lib/api'
import { translateApiError } from '../../lib/utils'
import { requestSent } from '../../lib/planLimits'

/**
 * "Pedir mais limite" (melhoria 62): one tap sends a standard e-mail to the
 * admin. The admin's address never shows in the app.
 */
export function useLimitRequest(plan: MyPlan | undefined) {
  const { lender } = useAuth()
  const { showToast } = useToast()
  const req = useRequestLimit()
  const sent = requestSent(plan) || req.isSuccess
  const note = sent
    ? `Pedido enviado. Vou te responder no seu e-mail${lender?.email ? ` (${lender.email})` : ''}.`
    : 'Para ter mais limite, fale comigo por e-mail: toque no botão e eu recebo seu pedido.'
  const send = () => {
    if (req.isPending) return
    if (sent) {
      showToast('Seu pedido já foi enviado. Dá para mandar de novo em 24 horas.', { icon: 'info' })
      return
    }
    req.mutate(undefined, {
      onSuccess: () => showToast('Pedido enviado. Vou te responder por e-mail.', { icon: 'send' }),
      onError: (e: unknown) => showToast(translateApiError(getApiError(e), 'Não foi possível enviar o pedido. Tente de novo.'), { icon: 'alert' }),
    })
  }
  return { sent, note, send, pending: req.isPending }
}
