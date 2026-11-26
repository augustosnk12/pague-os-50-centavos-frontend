import { api } from '../lib/axios'
import type { ChargeTone } from '../lib/reminder'

export type PixKeyType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM'

/** GET /settings (API B3). The Pix key comes normalized (CPF digits, +55…, lower-case e-mail). */
export interface LenderSettings {
  defaultCardDueDay: number | null
  defaultPixInstallmentDueDay: number | null
  pixKey: string | null
  pixKeyType: PixKeyType | null
  /** Item 68 (API V2, R7): null = Amigável. Absent on older APIs. */
  chargeTone?: ChargeTone | null
  /** Text of "Minha" (up to 1.000 characters); kept when the tone changes. */
  chargeTemplate?: string | null
}

export const settingsApi = {
  get: () => api.get<LenderSettings>('/settings'),
  /** Only the fields sent change (API B3). The Pix key goes with its type. */
  update: (data: Partial<LenderSettings>) => api.put<LenderSettings>('/settings', data),
}
