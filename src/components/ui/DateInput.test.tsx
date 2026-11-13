import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateInput } from './DateInput'
import { fmtBR, parseBR } from '../../lib/format'

function Harness({ initial = '', min, max }: { initial?: string; min?: string; max?: string }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <DateInput label="Primeiro vencimento" value={v} onChange={setV} min={min} max={max} />
      <output data-testid="iso">{v}</output>
    </>
  )
}

describe('Brazilian date format', () => {
  it('formats and parses DD/MM/AAAA', () => {
    expect(fmtBR('2026-11-09')).toBe('09/11/2026')
    expect(parseBR('09/11/2026')).toBe('2026-11-09')
    expect(parseBR('31/02/2026')).toBe('')
    expect(parseBR('29/02/2028')).toBe('2028-02-29')
    expect(parseBR('09/11')).toBe('')
  })
})

describe('DateInput', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-09T12:00:00-03:00'))
  })

  it('shows and types DD/MM/AAAA; the slashes come by themselves', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-12-05" />)
    const input = screen.getByRole('textbox', { name: /Primeiro vencimento/ })
    expect(input).toHaveValue('05/12/2026')
    await user.clear(input)
    await user.type(input, '01022027')
    expect(input).toHaveValue('01/02/2027')
    expect(screen.getByTestId('iso')).toHaveTextContent('2027-02-01')
  })

  it('an impossible day is an error, read with the field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: /Primeiro vencimento/ })
    await user.type(input, '31022026')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Data inválida. Use DD/MM/AAAA.')
  })

  it('calendar: pt-BR month, keyboard moves by day/week/month, Enter picks', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-11-09" />)
    await user.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    const cal = screen.getByRole('dialog', { name: 'Calendário: Primeiro vencimento' })
    expect(within(cal).getByText('novembro 2026')).toBeInTheDocument()
    const nine = within(cal).getByRole('button', { name: 'segunda, 9 de novembro de 2026' })
    await waitFor(() => expect(nine).toHaveFocus())
    expect(nine).toHaveAttribute('aria-pressed', 'true')
    expect(nine).toHaveAttribute('aria-current', 'date')
    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(within(cal).getByRole('button', { name: 'terça, 17 de novembro de 2026' })).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(within(cal).getByText('dezembro 2026')).toBeInTheDocument()
    expect(within(cal).getByRole('button', { name: 'quinta, 17 de dezembro de 2026' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('textbox', { name: /Primeiro vencimento/ })).toHaveValue('17/12/2026')
    expect(screen.getByTestId('iso')).toHaveTextContent('2026-12-17')
  })

  it('respects min: earlier days disabled and the previous month blocked', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-11-12" min="2026-11-10" />)
    await user.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    const cal = screen.getByRole('dialog')
    expect(within(cal).getByRole('button', { name: 'segunda, 9 de novembro de 2026' })).toBeDisabled()
    expect(within(cal).getByRole('button', { name: 'Mês anterior' })).toBeDisabled()
    // "Hoje" (9 nov) is out of range, so no shortcut.
    expect(within(cal).queryByRole('button', { name: 'Hoje' })).toBeNull()
  })

  it('"Hoje" picks today; a click outside closes', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-12-01" />)
    await user.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hoje' }))
    expect(screen.getByTestId('iso')).toHaveTextContent('2026-11-09')
    await user.click(screen.getByRole('button', { name: 'Abrir calendário' }))
    await user.click(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
