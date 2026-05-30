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
}
