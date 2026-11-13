import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode, useEffect } from 'react'
import { render, screen, act } from '@testing-library/react'
import { useCooldown } from './useCooldown'

function Counter({ storageKey = 'cd_test' }: { storageKey?: string }) {
  const { cooldown, start } = useCooldown(60, storageKey)
  // Same as "Confira seu e-mail": the countdown starts when the screen appears.
  useEffect(() => {
    start()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <output>{cooldown}</output>
}

const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('useCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('counts down under StrictMode (it used to freeze at 60)', () => {
    render(
      <StrictMode>
        <Counter />
      </StrictMode>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('60')
    tick(3000)
    expect(screen.getByRole('status')).toHaveTextContent('57')
    tick(57_000)
    expect(screen.getByRole('status')).toHaveTextContent('0')
    expect(localStorage.getItem('cd_test')).toBeNull()
  })

  it('survives a refresh: a new page continues from the stored end time', () => {
    const first = render(<Counter />)
    tick(20_000)
    first.unmount()
    render(<Counter />)
    expect(screen.getByRole('status')).toHaveTextContent('40')
    tick(1000)
    expect(screen.getByRole('status')).toHaveTextContent('39')
  })
})
