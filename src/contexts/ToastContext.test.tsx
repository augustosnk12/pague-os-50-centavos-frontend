import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'
import { TOAST_MS, TOAST_WITH_ACTION_MS } from '../lib/timing'

function Trigger({ msg, action }: { msg: string; action?: () => void }) {
  const { showToast } = useToast()
  return <button onClick={() => showToast(msg, action ? { action: { label: 'Desfazer', onClick: action } } : undefined)}>{msg}</button>
}

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the message and announces it in one persistent live region', () => {
    render(<ToastProvider><Trigger msg="Pagamento registrado" /></ToastProvider>)
    const region = screen.getByRole('status')
    fireEvent.click(screen.getByRole('button', { name: 'Pagamento registrado' }))
    advance(60)
    expect(region).toHaveTextContent('Pagamento registrado')
    expect(screen.getAllByText('Pagamento registrado').length).toBeGreaterThan(1) // visible toast + region
    expect(region.parentElement).toHaveAttribute('data-modal-keep')
  })

  it('stays for the reading time, then leaves', () => {
    render(<ToastProvider><Trigger msg="Salvo" /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Salvo' }))
    advance(TOAST_MS - 100)
    expect(document.querySelector('.lt-toast')).not.toBeNull()
    advance(400)
    expect(document.querySelector('.lt-toast')).toBeNull()
  })

  it('a new toast restarts the timer (it used to vanish early)', () => {
    render(<ToastProvider><Trigger msg="Primeiro" /><Trigger msg="Segundo" /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Primeiro' }))
    advance(TOAST_MS - 500)
    fireEvent.click(screen.getByRole('button', { name: 'Segundo' }))
    advance(1000)
    expect(document.querySelector('.lt-toast')).toHaveTextContent('Segundo')
  })

  it('"Desfazer": stays 10 s, runs the action and closes', () => {
    const undo = vi.fn()
    render(<ToastProvider><Trigger msg="Parcela quitada" action={undo} /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Parcela quitada' }))
    advance(TOAST_MS + 500)
    const btn = screen.getByRole('button', { name: 'Desfazer' })
    fireEvent.click(btn)
    expect(undo).toHaveBeenCalledOnce()
    advance(300)
    expect(document.querySelector('.lt-toast')).toBeNull()
    expect(TOAST_WITH_ACTION_MS).toBe(10000)
  })

  it('pauses while hovered or focused (WCAG 2.2.1)', () => {
    render(<ToastProvider><Trigger msg="Com pausa" action={() => {}} /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Com pausa' }))
    const toast = document.querySelector('.lt-toast')!
    fireEvent.mouseEnter(toast)
    advance(TOAST_WITH_ACTION_MS * 2)
    expect(document.querySelector('.lt-toast')).not.toBeNull()
    fireEvent.mouseLeave(toast)
    advance(TOAST_WITH_ACTION_MS + 500)
    expect(document.querySelector('.lt-toast')).toBeNull()
  })
})
