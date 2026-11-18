import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { fakeGet } from '../../test/fakeApi'
import { api } from '../../lib/axios'
import { crc16 } from '../../lib/pix'

vi.mock('../../lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const get = vi.mocked(api.get)

describe('Apoie o projeto (S11, item 51)', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/settings' ? { defaultCardDueDay: null, defaultPixInstallmentDueDay: null, pixKey: null, pixKeyType: null } : fakeGet(url) }),
    )
  })
  afterEach(() => vi.unstubAllEnvs())

  it('without VITE_SUPPORT_PIX the item does not appear', async () => {
    vi.stubEnv('VITE_SUPPORT_PIX', '')
    renderApp('/settings')
    await screen.findByRole('heading', { level: 1, name: 'Configurações' })
    expect(screen.queryByRole('button', { name: /Apoie o projeto/ })).toBeNull()
  })

  it('amounts and "Outro" give a Pix code with that exact amount; it can be copied', async () => {
    vi.stubEnv('VITE_SUPPORT_PIX', 'apoie@pague50.app')
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderApp('/settings')
    await user.click(await screen.findByRole('button', { name: /Apoie o projeto/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Apoie o projeto' })
    expect(within(sheet).getByRole('radio', { name: 'R$ 10' })).toHaveAttribute('aria-checked', 'true')
    const code = () => sheet.querySelector('.lt-coffee-code')?.textContent ?? ''
    expect(code()).toContain('apoie@pague50.app')
    expect(code()).toContain('540510.00') // field 54 (amount), 5 chars: "10.00"
    // The CRC at the end is valid.
    expect(code().slice(-4)).toBe(crc16(code().slice(0, -4)))
    // The QR is drawn (black modules on white).
    const qr = within(sheet).getByRole('img', { name: /QR Code Pix de R\$\s10,00/ })
    await waitFor(() => expect(qr.querySelector('path')?.getAttribute('d')?.length ?? 0).toBeGreaterThan(500))

    await user.click(within(sheet).getByRole('radio', { name: 'Outro' }))
    await user.type(within(sheet).getByRole('textbox', { name: 'Outro valor' }), '750')
    expect(code()).toContain('54047.50')
    await user.click(within(sheet).getByRole('button', { name: /Copiar código Pix/ }))
    expect(writeText).toHaveBeenCalledWith(code())
  })
})
