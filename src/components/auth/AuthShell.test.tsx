import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthShell } from './AuthShell'

const shell = () =>
  render(
    <MemoryRouter>
      <AuthShell>
        <h1>Entrar</h1>
      </AuthShell>
    </MemoryRouter>,
  )

describe('AuthShell · Aurora (improvement 59)', () => {
  afterEach(() => vi.useRealTimers())

  it('shows the promise; the decoration is hidden from screen readers and out of the tab order', () => {
    const { container } = shell()
    expect(screen.getByText('Quem te deve, quanto e quando. Sem planilha.')).toBeInTheDocument()
    const coins = container.querySelector('.lt-au-coins')!
    expect(coins).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.lt-au-egg')).toHaveAttribute('tabindex', '-1')
    expect(screen.queryAllByRole('button')).toHaveLength(0) // nothing decorative reaches assistive tech
  })

  it('easter egg: the pig leaps only on the 10th tap, is announced and leaves', () => {
    vi.useFakeTimers()
    const { container } = shell()
    const egg = () => container.querySelector('.lt-au-egg')!
    for (let i = 0; i < 9; i++) fireEvent.click(egg())
    expect(container.querySelector('.lt-pig')).toBeNull()
    fireEvent.click(egg())
    expect(container.querySelector('.lt-pig svg rect')).not.toBeNull()
    expect(container.querySelectorAll('.lt-pig-puff')).toHaveLength(8)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Oinc! Um porquinho fugiu da tela.')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(container.querySelector('.lt-pig')).toBeNull()
    // The count starts again.
    for (let i = 0; i < 9; i++) fireEvent.click(egg())
    expect(container.querySelector('.lt-pig')).toBeNull()
  })
})
