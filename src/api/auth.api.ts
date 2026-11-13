import { api } from '../lib/axios'
import type { Lender } from '../types/lender'

export interface RegisterPayload {
  email: string
  name: string
}

export interface LoginPayload {
  email: string
}

export interface ResendConfirmationPayload {
  email: string
}

export interface VerifyResponse {
  accessToken: string
  lender: Pick<Lender, 'id' | 'email' | 'name'>
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ message: string }>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<{ message: string }>('/auth/login', data),

  resendConfirmation: (data: ResendConfirmationPayload) =>
    api.post<{ message: string }>('/auth/resend-confirmation', data),

  confirm: (token: string) =>
    api.get<{ message: string }>(`/auth/confirm?token=${token}`),

  verify: (token: string) =>
    api.get<VerifyResponse>(`/auth/verify?token=${token}`),

  /** UI v2 (API B11): log in with the 6-digit code from the e-mail. */
  verifyCode: (data: { email: string; code: string }) =>
    api.post<VerifyResponse>('/auth/verify-code', data),

  /** UI v2 (API B11): confirm a new account with the code — also logs in. */
  confirmCode: (data: { email: string; code: string }) =>
    api.post<VerifyResponse>('/auth/confirm-code', data),
}
