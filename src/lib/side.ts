/**
 * "Eu devo" (item 75): the app has two sides with the same screens. "Me devem"
 * is the app of today (debtors); "Eu devo" lists the people you owe
 * (creditors, `kind=CREDITOR` in the API). The side is kept on this device.
 */

export type Side = 'in' | 'out'
export type PersonKind = 'DEBTOR' | 'CREDITOR'

export const kindOf = (side: Side): PersonKind => (side === 'out' ? 'CREDITOR' : 'DEBTOR')

export const SIDE_LABEL: Record<Side, string> = { in: 'Me devem', out: 'Eu devo' }
export const SIDE_SUB: Record<Side, string> = { in: 'Quem tem que te pagar', out: 'Quem você tem que pagar' }

const KEY = 'pague50_side'

/** The last side used on this device; a new device opens in "Me devem". */
export function readSide(): Side {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'out' ? 'out' : 'in'
  } catch {
    return 'in'
  }
}

export function storeSide(side: Side) {
  try {
    if (side === 'out') localStorage.setItem(KEY, 'out')
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode / blocked storage: the side just is not remembered */
  }
}

/**
 * The words of the "Eu devo" side (same list as the approved mock): Devedores
 * → Credores, Recebimentos → Pagamentos, A receber → A pagar, Receber → Pagar…
 * Order matters (longer phrases first).
 */
const WORDS: [RegExp, string][] = [
  [/quem precisa te pagar/g, 'quem você precisa pagar'],
  [/Quem mais vai te pagar/g, 'Quem mais você vai pagar'],
  [/Quem tem que te pagar/g, 'Quem você tem que pagar'],
  [/o que ainda vai entrar/g, 'o que ainda vai sair'],
  [/Cadastre quem te deve/g, 'Cadastre para quem você deve'],
  [/pessoa que te deve/g, 'pessoa para quem você deve'],
  [/Registre quanto a pessoa deve/g, 'Registre quanto você deve'],
  [/Registre o que essa pessoa te deve/g, 'Registre o que você deve para essa pessoa'],
  [/Para quem é a dívida\?/g, 'Para quem você deve?'],
  [/Para quem\?/g, 'Para quem você deve?'],
  [/Já deve /g, 'Você já deve '],
  [/^Deve /g, 'Você deve '],
  [/Devedores/g, 'Credores'],
  [/devedores/g, 'credores'],
  [/Devedora/g, 'Credora'],
  [/devedora/g, 'credora'],
  [/Devedor/g, 'Credor'],
  [/devedor/g, 'credor'],
  [/Recebimentos/g, 'Pagamentos'],
  [/recebimentos/g, 'pagamentos'],
  [/Recebido/g, 'Pago'],
  [/recebidos/g, 'pagos'],
  [/recebidas/g, 'pagas'],
  [/recebido/g, 'pago'],
  [/recebida/g, 'paga'],
  [/A receber/g, 'A pagar'],
  [/a receber/g, 'a pagar'],
  [/Receber/g, 'Pagar'],
  [/receber/g, 'pagar'],
  [/Recebeu/g, 'Pagou'],
  [/recebeu/g, 'pagou'],
  [/te deve/g, 'você deve'],
  [/Te devem/g, 'Você deve'],
]

/** A text as the given side says it (unchanged in "Me devem"). */
export function sideText(text: string, side: Side): string {
  if (side === 'in') return text
  let t = text
  for (const [a, b] of WORDS) t = t.replace(a, b)
  return t
}
