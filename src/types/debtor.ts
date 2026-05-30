export interface Debtor {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  lenderId: string
  createdAt: string
}
