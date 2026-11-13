/**
 * Pix "copia e cola" (BR Code, static) generated in the app, without any
 * bank integration (improvement 33). Format: EMV® QRCPS-MPM as specified in
 * the Central Bank's "Manual de Padrões para Iniciação do Pix":
 * ID (2 digits) + length (2 digits) + value, ending with a CRC16-CCITT
 * (polynomial 0x1021, initial value 0xFFFF) over the whole payload
 * including "6304".
 */

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`

export function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Name and city fields only take plain ASCII: accents removed, length capped. */
function plain(text: string, max: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trimEnd()
}

export interface BrCodeInput {
  /** Pix key already normalized (CPF digits, +55…, e-mail, random key). */
  key: string
  /** Receiver's name (max 25 chars in the code). */
  name: string
  /** Receiver's city (max 15 chars in the code). */
  city?: string
  /** Exact amount in reais; omitted = the payer types it. */
  amount?: number
  /** Reference shown in the payer's bank; "***" when none. */
  txid?: string
}

export function brCode({ key, name, city = 'BRASIL', amount, txid = '***' }: BrCodeInput): string {
  const account = field('00', 'br.gov.bcb.pix') + field('01', key)
  const payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (amount && amount > 0 ? field('54', amount.toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', plain(name, 25) || 'RECEBEDOR') +
    field('60', plain(city, 15) || 'BRASIL') +
    field('62', field('05', txid)) +
    '6304'
  return payload + crc16(payload)
}
