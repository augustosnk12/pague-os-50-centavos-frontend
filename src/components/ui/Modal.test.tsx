import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { MODAL_EXIT_MS } from '../../lib/timing'

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <button>Fora</button>
      <Modal
        open={open}
        title="Registrar pagamento"
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        footer={<button>Salvar</button>}
      >
        <input aria-label="Valor" />
      </Modal>
    </div>
  )
}

// Wait for the close (exit animation + unmount) instead of a fixed delay: CI runners are slower.
const settle = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: MODAL_EXIT_MS + 2000 })

describe('Modal (accessible dialog)', () => {
  it('is a labelled modal dialog and moves focus to the first field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Registrar pagamento' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Valor' })).toHaveFocus())
  })

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Valor' })).toHaveFocus())
    await user.tab() // → Salvar
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus()
    await user.tab() // wraps → Fechar
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
    await user.tab({ shift: true }) // wraps back → Salvar
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus()
  })

  it('makes the page behind inert while open, and restores it after closing', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await screen.findByRole('dialog')
    expect(container).toHaveAttribute('inert')
    await user.keyboard('{Escape}')
    await settle()
    await waitFor(() => expect(container).not.toHaveAttribute('inert'))
  })

  it('Esc, the close button and a click on the backdrop close it; focus returns to the opener', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Abrir' })

    await user.click(opener)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(opener).toHaveFocus())

    await user.click(opener)
    await user.click(await screen.findByRole('button', { name: 'Fechar' }))
    await settle()

    await user.click(opener)
    const dialog = await screen.findByRole('dialog')
    await user.click(dialog.parentElement!) // the backdrop
    await settle()
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a click inside the dialog does not close it', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(await screen.findByRole('textbox', { name: 'Valor' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('plays an exit animation before unmounting', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(dialog.parentElement).toHaveAttribute('data-closing'))
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Modal: Esc right after opening', () => {
  it('closes even before focus has moved inside (slow devices)', async () => {
    const onClose = vi.fn()
    render(<Modal open title="Folha" onClose={onClose}><input aria-label="Campo" /></Modal>)
    // No waiting for the initial focus: the key goes to <body>.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('with nested dialogs, Esc closes only the top one', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <>
        <Modal open title="Fora" onClose={outer}><p>a</p></Modal>
        <Modal open title="Dentro" onClose={inner}><p>b</p></Modal>
      </>,
    )
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(inner).toHaveBeenCalledOnce()
    expect(outer).not.toHaveBeenCalled()
  })
})
