// Public ViaCEP lookup. Uses bare fetch (NOT the app axios instance) so we don't
// send the JWT to a third party or prepend the backend baseURL.

export interface ViaCepAddress {
  street: string
  neighborhood: string
  city: string
  state: string
}

interface ViaCepResponse {
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean | string
}

// Returns the resolved address, or null when the CEP is invalid, not found,
// or the service is unreachable — callers fall back to manual entry.
export async function fetchCep(cepDigits: string): Promise<ViaCepAddress | null> {
  if (!/^\d{8}$/.test(cepDigits)) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
    if (!res.ok) return null

    const data = (await res.json()) as ViaCepResponse
    if (data.erro) return null

    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    }
  } catch {
    return null
  }
}
