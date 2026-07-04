export interface Address {
  id: string
  zip: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  debtorId: string
}

export interface Debtor {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  lenderId: string
  createdAt: string
  address: Address | null
}
