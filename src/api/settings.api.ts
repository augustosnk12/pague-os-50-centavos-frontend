import { api } from '../lib/axios'

export type PixKeyType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM'

/** GET /settings (API B3). The Pix key comes normalized (CPF digits, +55…, lower-case e-mail). */
export interface LenderSettings {
  defaultCardDueDay: number | null
  defaultPixInstallmentDueDay: number | null
  pixKey: string | null
  pixKeyType: PixKeyType | null
}

export const settingsApi = {
  get: () => api.get<LenderSettings>('/settings'),
}
