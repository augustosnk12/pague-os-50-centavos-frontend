import { api } from '../lib/axios'

/** POST /contact: the landing's contact form (the developer's address stays on the server). */
export interface ContactBody {
  name?: string
  email: string
  message: string
  /** Honeypot: always empty for people (the field is hidden). */
  website?: string
  /** Signed form token (GET /contact/token): the message must come 3 s – 6 h after it. */
  token?: string
}

export const contactApi = {
  token: () => api.get<{ token: string }>('/contact/token'),
  send: (body: ContactBody) => api.post<void>('/contact', body),
}
