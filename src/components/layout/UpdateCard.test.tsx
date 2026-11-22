import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdateCard } from './UpdateCard'
import { axeViolations } from '../../test/axe'

describe('"Nova versão disponível" (PWA)', () => {
  it('says what it is and offers Atualizar / Depois', async () => {
    const onUpdate = vi.fn()
    const onLater = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<UpdateCard updating={false} onUpdate={onUpdate} onLater={onLater} />)
    const card = screen.getByRole('status', { name: 'Nova versão disponível' })
    expect(card).toHaveClass('lt-update')
    expect(card).toHaveTextContent('Atualize para usar a versão mais recente.')
    await user.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(onUpdate).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Depois' }))
    expect(onLater).toHaveBeenCalledOnce()
    expect(await axeViolations(container)).toEqual([])
  })

  it('while updating: "Atualizando…" and Depois off', () => {
    render(<UpdateCard updating onUpdate={vi.fn()} onLater={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Atualizando…' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Depois' })).toBeDisabled()
  })
})
